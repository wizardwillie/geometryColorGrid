# Grid Geometry Painter

This is a small browser-based tool for building block patterns on a grid and painting the exposed faces of each shape.

## Run it

Because this app is plain HTML, CSS, and JavaScript, there is no build step.

You can either open `index.html` directly in a browser, or serve the folder locally:

```bash
cd /Users/williambutler/Desktop/gridGeometry
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Host it

This project can be deployed as a static site on any host that serves files directly.

Good options:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

For any of those, upload or connect this folder and publish the files as-is with `index.html` at the site root.

## Use it

- Raise, lower, or erase blocks on the pattern grid.
- Turn on symmetry to mirror your edits.
- Rotate the preview to reach different side faces.
- Pick a swatch or custom color, then click a visible face to paint it.
