import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/models/yolo26n-pose.onnx",
        destination:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26n-pose.onnx",
      },
    ];
  },
};

export default nextConfig;
