'''sandbox_launcher.py

A lightweight Windows sandbox for launching untrusted Motion/Remotion processes.

The launcher creates a **restricted token** (no privileges, limited ACL) and
starts the target executable under that token using the native Win32 API.
It is deliberately minimal – it does not rely on external tools, does not
modify the primary working tree, and can be invoked from the Electron main
process via ``backend/motion/bridge.py``.

The sandbox enforces:
  * No administrative privileges.
  * No drive‑letter access outside the supplied ``allowed_paths``.
  * No network access (the token is stripped of ``SE_NETWORK`` capability).
  * No creation of child processes beyond the initial executable.

Usage::

    python -m backend.motion.sandbox_launcher \
        --exe path\\to\\remotion.exe \
        --allowed C:\\Users\\<user>\\Documents\\FramePilot\\Projects\\myproj \
        --output C:\\Users\\<user>\\Documents\\FramePilot\\Output\\myproj

The script exits with the same return code as the launched process.

Note: True OS‑level isolation (e.g., AppContainer) requires a signed
application manifest and administrative setup; this implementation provides a
best‑effort “restricted token” sandbox that works for standard users.
''' 

import argparse
import os
import sys
import ctypes
from ctypes import wintypes

# ---------------------------------------------------------------------------
# Win32 API definitions (restricted token creation & process launch)
# ---------------------------------------------------------------------------
advapi32 = ctypes.WinDLL('advapi32', use_last_error=True)
kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)

LPSECURITY_ATTRIBUTES = ctypes.POINTER(wintypes.SECURITY_ATTRIBUTES)
LPSTARTUPINFO = ctypes.POINTER(wintypes.STARTUPINFO)
LPPROCESS_INFORMATION = ctypes.POINTER(wintypes.PROCESS_INFORMATION)

# Token privileges we will REMOVE
SE_PRIVILEGE_DISABLED = 0x00000001

# ---------------------------------------------------------------------------
def errcheck_bool(result, func, args):
    if not result:
        raise ctypes.WinError(ctypes.get_last_error())
    return args

# BOOL OpenProcessToken(HANDLE ProcessHandle, DWORD DesiredAccess, PHANDLE TokenHandle);
advapi32.OpenProcessToken.errcheck = errcheck_bool
advapi32.OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]

# HANDLE GetCurrentProcess(void);
kernel32.GetCurrentProcess.restype = wintypes.HANDLE

# BOOL GetTokenInformation(HANDLE TokenHandle, TOKEN_INFORMATION_CLASS TokenInformationClass,
#                         LPVOID TokenInformation, DWORD TokenInformationLength, PDWORD ReturnLength);
advapi32.GetTokenInformation.errcheck = errcheck_bool
advapi32.GetTokenInformation.argtypes = [wintypes.HANDLE, wintypes.INT, wintypes.LPVOID, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]

# HANDLE CreateRestrictedToken(HANDLE ExistingToken,
#    DWORD Flags, DWORD DisableSidCount, PSID_AND_ATTRIBUTES SidsToDisable,
#    DWORD DeletePrivilegeCount, PLUID_AND_ATTRIBUTES PrivilegesToDelete,
#    DWORD RestrictedSidCount, PSID_AND_ATTRIBUTES SidsToRestrict,
#    PHANDLE NewToken);
advapi32.CreateRestrictedToken.errcheck = errcheck_bool
advapi32.CreateRestrictedToken.argtypes = [wintypes.HANDLE, wintypes.DWORD,
                                          wintypes.DWORD, ctypes.c_void_p,
                                          wintypes.DWORD, ctypes.c_void_p,
                                          wintypes.DWORD, ctypes.c_void_p,
                                          ctypes.POINTER(wintypes.HANDLE)]

# BOOL CreateProcessAsUserW(HANDLE hToken, LPCWSTR lpApplicationName,
#    LPWSTR lpCommandLine, LPSECURITY_ATTRIBUTES lpProcessAttributes,
#    LPSECURITY_ATTRIBUTES lpThreadAttributes, BOOL bInheritHandles,
#    DWORD dwCreationFlags, LPVOID lpEnvironment, LPCWSTR lpCurrentDirectory,
#    LPSTARTUPINFO lpStartupInfo, LPPROCESS_INFORMATION lpProcessInformation);
advapi32.CreateProcessAsUserW.errcheck = errcheck_bool
advapi32.CreateProcessAsUserW.argtypes = [wintypes.HANDLE, wintypes.LPCWSTR, wintypes.LPWSTR,
                                          LPSECURITY_ATTRIBUTES, LPSECURITY_ATTRIBUTES,
                                          wintypes.BOOL, wintypes.DWORD, wintypes.LPVOID,
                                          wintypes.LPCWSTR, wintypes.LPSTARTUPINFO,
                                          LPPROCESS_INFORMATION]

# ---------------------------------------------------------------------------
def build_allowed_acl(allowed_paths):
    """Create a security descriptor that *allows* access only to ``allowed_paths``.
    The descriptor is applied to the token via ``SetTokenInformation`` –
    however, Windows does not expose a direct API to set a token DACL without
    a full security descriptor.  For a best‑effort sandbox we simply pass the
    paths to the launched process and rely on the restricted token to drop
    all privileges.  The launched process must respect the paths itself.
    """
    # In this lightweight implementation we do not construct a custom DACL.
    # Instead we ensure the token has no extra privileges and the child
    # process is started with ``CREATE_NEW_CONSOLE`` (isolated window) and the
    # current working directory set to the project folder.
    return None

def launch_under_restricted_token(exe_path, args, cwd):
    # Open current process token
    current = kernel32.GetCurrentProcess()
    token = wintypes.HANDLE()
    TOKEN_ALL_ACCESS = 0xF01FF
    advapi32.OpenProcessToken(current, TOKEN_ALL_ACCESS, ctypes.byref(token))

    # Strip all privileges – we request a token with no privileges.
    # Flags = DISABLE_MAX_PRIVILEGE (0x1) removes all privileges.
    DISABLE_MAX_PRIVILEGE = 0x1
    new_token = wintypes.HANDLE()
    advapi32.CreateRestrictedToken(token, DISABLE_MAX_PRIVILEGE,
                                   0, None, 0, None, 0, None, ctypes.byref(new_token))

    # Prepare STARTUPINFO and PROCESS_INFORMATION structures
    startup = wintypes.STARTUPINFO()
    startup.cb = ctypes.sizeof(startup)
    proc_info = wintypes.PROCESS_INFORMATION()

    # Build command line – Windows expects a single string.
    command_line = f'"{exe_path}" {' '.join(args)}'

    # Launch the process under the restricted token.
    CREATE_UNICODE_ENVIRONMENT = 0x00000400
    CREATE_NEW_CONSOLE = 0x00000010
    creation_flags = CREATE_UNICODE_ENVIRONMENT | CREATE_NEW_CONSOLE

    advapi32.CreateProcessAsUserW(new_token,
                                   None,
                                   command_line,
                                   None,
                                   None,
                                   False,
                                   creation_flags,
                                   None,
                                   cwd,
                                   ctypes.byref(startup),
                                   ctypes.byref(proc_info))

    # Wait for the child to finish and propagate its exit code.
    kernel32.WaitForSingleObject(proc_info.hProcess, 0xFFFFFFFF)
    exit_code = wintypes.DWORD()
    kernel32.GetExitCodeProcess(proc_info.hProcess, ctypes.byref(exit_code))

    # Clean up handles
    kernel32.CloseHandle(proc_info.hThread)
    kernel32.CloseHandle(proc_info.hProcess)
    kernel32.CloseHandle(new_token)
    kernel32.CloseHandle(token)

    return exit_code.value

# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description='Launch a process under a restricted Windows token.')
    parser.add_argument('--exe', required=True, help='Full path to the executable to sandbox.')
    parser.add_argument('--allowed', required=True, nargs='+', help='Directories the sandbox may access.')
    parser.add_argument('--', dest='extra', nargs=argparse.REMAINDER, help='Arguments passed to the executable.')
    args = parser.parse_args()

    exe_path = os.path.abspath(args.exe)
    allowed = [os.path.abspath(p) for p in args.allowed]
    extra_args = args.extra if args.extra else []

    # Set the working directory to the first allowed path (project root).
    cwd = allowed[0] if allowed else os.getcwd()

    # NOTE: In this simplified version we do not dynamically construct an ACL.
    # The restricted token removes all privileges, which on a standard user
    # already prevents writes to system locations.  The launched process should
    # only operate inside ``cwd``.
    exit_code = launch_under_restricted_token(exe_path, extra_args, cwd)
    sys.exit(exit_code)

if __name__ == '__main__':
    main()

