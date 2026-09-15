# Đại chiến Cyber City 4.0

Trò chơi tương tác nhiều người dành cho Bài 2 Tin học 10: **Vai trò của thiết bị thông minh và Tin học đối với xã hội**.

## Chức năng

- Giao diện giáo viên và học sinh tách biệt.
- Học sinh tham gia bằng mã phòng 6 số và tên hiển thị, không cần tài khoản.
- Giáo viên xem trực tiếp tên, số lượng và tiến độ trả lời của học sinh.
- 17 câu hỏi, tính điểm theo độ chính xác và tốc độ.
- Phản hồi vui sau mỗi đáp án, bảng xếp hạng và bục vinh danh Top 3.
- Giáo viên chỉnh thời gian, kết thúc câu hoặc kết thúc toàn bộ trò chơi.
- Phòng chơi tự hết hạn sau 6 giờ.

## Chạy tại máy

```bash
npm install
ALLOW_MEMORY_STORE=1 npm run dev
```

Mở `http://localhost:3000`.

Chế độ bộ nhớ chỉ dùng để phát triển trên một máy. Bản triển khai nhiều thiết bị cần Redis.

## Kho dữ liệu

Ứng dụng hỗ trợ Upstash Redis với một trong hai cặp biến môi trường:

- `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`
- `KV_REST_API_URL` và `KV_REST_API_TOKEN`

Không đưa token Redis vào mã nguồn hoặc biến `NEXT_PUBLIC_*`.

## Triển khai

Dự án dùng Next.js App Router, Route Handlers và Upstash Redis, tối ưu để triển khai trên Vercel.

Trang chơi Production: https://mini-game-nguyen-van-lung-s-projects.vercel.app/
