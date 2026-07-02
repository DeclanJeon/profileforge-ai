# Changelog

All notable ProfileForge AI production changes are recorded here in release order.

## 0.3.0 - 2026-07-02

### Added
- Added fashion, hair, and full makeover generation modes with identity-preserving prompts.
- Added camera-shot and motion presets for close-up, half-body, walking, full-body, and low-angle outputs.
- Added 500 hairstyle prompt presets and 88 era-fashion prompt presets.
- Added generated style thumbnails for every hairstyle and fashion preset.
- Wired generated preset data and thumbnails into the style-selection UI.
- Added GitHub Actions CI for lint/build verification and a production deploy workflow for `ponslink`.

### Verified
- Generated five real QA samples from `/home/declan/Downloads/profile_4.png` covering Rachel cut, buzz cut, leather jacket, pompadour, and man bun styles.
- Verified generated preset prompt wiring, lint, and production build.

## 0.2.0 - 2026-07-01

### Added
- Added social preview thumbnail and SEO sharing image.
- Added routed Google-auth flow and SEO metadata.
- Added privacy policy and terms pages.
- Added ProfileForge worker supervision for production.

### Changed
- Generated images are attached to email and deleted immediately after successful delivery.
- Deleted email-only previews are hidden from the browser polling surface.
- Production image-provider host configuration was fixed.

## 0.1.0 - 2026-06-30

### Added
- Initial public release of ProfileForge AI.
- Added curated profile concepts, concept thumbnails, and generation UX.
- Added async queue, storage, email, and download flow.
- Added queue estimates, retention hardening, and R2 lazy loading.
- Added Google login requirement for delivery email.
- Added Node-compatible worker runtime support.
