# Graduation Memories (MVP)
```bash
npm install
npm run dev        # http://localhost:5173  (thêm ?debug=1 để xem khung ghép mặt)
npm run build      # xuất ra dist/ -> deploy Cloudflare Pages / Netlify
```
- Template: `public/templates/*.webp`. Toạ độ ghép: `src/config/templateConfig.ts` (tỉ lệ 0..1, hiện là ƯỚC LƯỢNG).
- Ghép ảnh: `src/utils/compose.ts` (preview scale 1, xuất file scale 2).
- Deploy Cloudflare Pages: build command `npm run build`, output directory `dist`.
