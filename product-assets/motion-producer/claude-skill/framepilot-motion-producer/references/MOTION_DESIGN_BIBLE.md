# FramePilot Motion Design Bible

## Guiding principle

Motion should make the message easier to understand, the evidence easier to read, or the emotional beat more memorable. If an effect does not improve one of those outcomes, remove it.

## 1. Design intent and hierarchy

Every scene must define one dominant focal point, one supporting layer and optional tertiary detail. The hierarchy is established through scale, position, contrast, spacing and timing before decoration.

The user should understand the visual in this order:

1. What is the subject?
2. What is changing or being compared?
3. Why does it matter?

Use negative space intentionally. Avoid competing focal points, decorative overload, generic HUDs, meaningless graphs, random pyramids, irrelevant charts, fake interface widgets and repeated card layouts.

## 2. Choose a project visual language

Select one primary language based on content:

- Editorial documentary illustration.
- Archival / museum evidence treatment.
- Precision data visualization.
- Minimal kinetic typography.
- Product / interface demonstration.
- Technical system diagram.
- Architectural / geographic evolution.
- Cinematic photographic montage.
- Mixed-media explainer.

A project may combine two compatible languages, but should state which is primary. Do not impose the same palette and composition onto every subject or company.

## 3. Spatial composition

Specify:

- Frame ratio and safe zones.
- Primary subject position and scale.
- Foreground / midground / background relationship.
- Text region and maximum text width.
- Alignment grid and spacing increments.
- Depth order and overlap policy.
- Responsive crop policy for each supported aspect ratio.

Do not place critical information at extreme edges. Do not cover faces, historical evidence, product details, chart values or the central subject with decorative type.

## 4. Scene rhythm

Use a controlled alternation of:

- Establishing shots.
- Detail / evidence shots.
- Explanatory graphics.
- Comparison compositions.
- Kinetic text emphasis.
- Quiet holds for important statements.

The sequence should not become a loop of title card → image → card → image. Avoid cuts that occur solely because a fixed number of frames elapsed.

## 5. Motion personality

Choose a small set of motion qualities for the project: measured, elastic, mechanical, editorial, fluid, weighty, delicate, urgent or restrained. Apply them consistently to related elements.

- Heavy objects: slower acceleration and less overshoot.
- UI-like controls: small, crisp response with restrained spring.
- Documentary labels: short, controlled movement and readable hold.
- Evidence photographs: protect the image; use only motivated camera movement.
- Data: animate from a truthful zero/reference state, preserve scale and labels.

## 6. Depth and compositing

Use layers only when they improve separation:

- Environment/background.
- Primary image or object.
- Supporting evidence/details.
- Explanatory graphics and labels.
- Finishing grade.

Do not create fake depth that distorts architecture, faces, machinery or maps. A subtle parallax move requires real layer separation or a clear statement that the treatment is illustrative. Do not fake missing depth by stretching a single image aggressively.

## 7. Color and finish

Create tokens in `src/theme.ts`: base background, surface, primary text, secondary text, accent(s), semantic status colors, type scale, spacing, radius, shadow and motion presets.

- Use a restrained dominant palette with one primary accent.
- Add a second accent only when it communicates a second category.
- Maintain readable contrast.
- Grain, vignette, blur, glow and gradients are optional treatments, not mandatory effects.
- Do not use a finishing stack that obscures evidence or needlessly increases render cost.

## 8. Camera rules

Each shot declares one mode: `locked`, `slow_push`, `slow_pull`, `pan`, `tilt`, `parallax`, `reframe`, or `static_graphic`.

A locked-camera instruction takes precedence over this Skill's defaults. Do not add Ken Burns motion automatically to every still. For a fixed-camera historical evolution, camera geometry does not drift between periods.

## 9. Repetition and originality

Reusable components are encouraged; repeated compositions are not. Vary visual structure based on story function, while preserving the same design language. Do not reproduce a source creator's exact layouts, branding, demo composition or distinctive animated sequence.
