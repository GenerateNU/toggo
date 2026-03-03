# Static assets for server-rendered pages

Put assets here for backend-rendered HTML (invite pages, etc.). They are embedded into the binary and served at `/static/*`.

- **toggo_logo.svg** – App logo (use in templates via `<img src="/static/logo.svg" alt="..." />` or inline)
- **favicon.ico** – Browser tab icon (optional)
- Other images, fonts, or small assets as needed

Keep files small; for large or user-generated assets use S3/CDN instead.
