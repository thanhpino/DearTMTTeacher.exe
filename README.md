# Dear Teacher.exe — The Gratitude Pipeline

Thiệp tri ân Ngày Nhà giáo Việt Nam. Ẩn dụ: **trồng người = CI/CD pipeline**.
`Plant → Build → Test → Deploy → Monitor → Push`

## Chạy
- **Cách chính:** giải nén, double-click `index.html` (zero-dependency, chạy bằng `file://`).
- Cá nhân hóa: `index.html?to=Thầy Nam`
- Phím: `Space`/`→` bỏ qua chặng, `D` bật panel quan sát.
- Docker (bonus): `docker build -t dear-teacher . && docker run --rm -p 8080:80 dear-teacher`

## Cấu trúc
```
index.html · css/style.css · config/gratitude.config.js · js/{world,timeline,terminal,main}.js
assets/fonts/ (woff2 cục bộ) · tests/smoke.js · Dockerfile · .github/workflows/ci.yml
```

## Trạng thái
- [x] Skeleton: World state, Timeline `world = f(t)`, canvas DPR, Skip, panel `D`
- [x] Font cục bộ (subset Latin + Vietnamese), lời chúc thật trong config
- [x] Terminal boot + log bão (hàm của `t`)
- [ ] Cây thuật toán · mưa/hạt · dashboard · audio · cảnh Push

Quy tắc: không dùng ES modules (để `file://` chạy được).
