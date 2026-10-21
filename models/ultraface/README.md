# UltraFace (Ultra-Light-Fast-Generic-Face-Detector-1MB)

- File: `version-RFB-320.onnx` (1,2 MB)
- Nguồn: https://github.com/onnx/models/tree/main/validated/vision/body_analysis/ultraface (gốc: https://github.com/Linzaer/Ultra-Light-Fast-Generic-Face-Detector-1MB)
- Giấy phép: MIT
- SHA-256: `34cd7e60aeff28744c657de7a3dc64e872d506741de66987f3426f2b79f88017`
- Đầu vào [1, 3, 240, 320] RGB, (pixel − 127) / 128; đầu ra `scores` [1, 4420, 2] và `boxes` [1, 4420, 4] (toạ độ góc, chuẩn hoá 0..1).

Dùng trong Làm ảnh thẻ để tìm khuôn mặt và cằm, từ đó tự căn khung.
