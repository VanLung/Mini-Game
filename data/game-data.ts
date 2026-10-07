export type Option = {
  id: string;
  label: string;
};

export type RoundScreen = {
  kind: "round";
  round: number;
  keyName: "SMART" | "AI" | "IMPACT" | "CORE";
  title: string;
  subtitle: string;
  mission: string;
};

export type QuestionScreen = {
  kind: "question";
  round: number;
  keyName: "SMART" | "AI" | "IMPACT" | "CORE";
  category: string;
  title: string;
  prompt: string;
  options: Option[];
  correct: string[];
  answer: string;
  explanation: string;
  time: number;
};

export type BossScreen = {
  kind: "boss";
  round: 5;
  keyName: "BOSS";
  title: string;
  prompt: string;
  requirements: string[];
  answer: string[];
  time: number;
};

export type ResultsScreen = {
  kind: "results";
  title: string;
};

export type GameScreen = RoundScreen | QuestionScreen | BossScreen | ResultsScreen;

export const roundMeta = [
  {
    "round": 1,
    "keyName": "SMART",
    "title": "Khám phá cấu tạo Big Mouth"
  },
  {
    "round": 2,
    "keyName": "AI",
    "title": "Lắp ráp và kiểm tra an toàn"
  },
  {
    "round": 3,
    "keyName": "IMPACT",
    "title": "Lập trình miệng robot"
  },
  {
    "round": 4,
    "keyName": "CORE",
    "title": "Thử nghiệm và xử lý lỗi"
  }
] as const;

export const gameScreens: GameScreen[] = [
  {
    "kind": "round",
    "round": 1,
    "keyName": "SMART",
    "title": "Khám phá cấu tạo Big Mouth",
    "subtitle": "Đầu, thân, đuôi và chuyển động của hàm",
    "mission": "Nhận biết các bộ phận và cách miệng robot chuyển động."
  },
  {
    "kind": "question",
    "round": 1,
    "keyName": "SMART",
    "category": "Big Mouth I · Cấu tạo",
    "title": "Câu 1: Big Mouth gồm ba phần chính nào?",
    "prompt": "Big Mouth gồm ba phần chính nào?",
    "options": [
      {
        "id": "A",
        "label": "Đầu, chân và bánh xe"
      },
      {
        "id": "B",
        "label": "Đầu, thân và đuôi"
      },
      {
        "id": "C",
        "label": "Thân, cánh và bánh xe"
      },
      {
        "id": "D",
        "label": "Đầu, cánh và chân"
      }
    ],
    "correct": [
      "B"
    ],
    "answer": "B. Đầu, thân và đuôi",
    "explanation": "Big Mouth gồm đầu, thân và đuôi. Mỗi phần có vai trò riêng trong mô hình.",
    "time": 20
  },
  {
    "kind": "question",
    "round": 1,
    "keyName": "SMART",
    "category": "Big Mouth I · Cấu tạo",
    "title": "Câu 2: Phần nào của Big Mouth chứa miệng và cơ cấu hàm?",
    "prompt": "Phần nào của Big Mouth chứa miệng và cơ cấu hàm?",
    "options": [
      {
        "id": "A",
        "label": "Phần thân"
      },
      {
        "id": "B",
        "label": "Phần đuôi"
      },
      {
        "id": "C",
        "label": "Phần đầu"
      },
      {
        "id": "D",
        "label": "Dây kết nối"
      }
    ],
    "correct": [
      "C"
    ],
    "answer": "C. Phần đầu",
    "explanation": "Phần đầu chứa miệng và cơ cấu hàm để robot mở, đóng miệng.",
    "time": 20
  },
  {
    "kind": "question",
    "round": 1,
    "keyName": "SMART",
    "category": "Big Mouth I · Cấu tạo",
    "title": "Câu 3: Controller được gắn chắc vào phần nào của Big Mouth?",
    "prompt": "Controller được gắn chắc vào phần nào của Big Mouth?",
    "options": [
      {
        "id": "A",
        "label": "Phần thân"
      },
      {
        "id": "B",
        "label": "Phần đuôi"
      },
      {
        "id": "C",
        "label": "Hàm dưới"
      },
      {
        "id": "D",
        "label": "Dây servo"
      }
    ],
    "correct": [
      "A"
    ],
    "answer": "A. Phần thân",
    "explanation": "Controller được gắn chắc vào phần thân để điều khiển mô hình.",
    "time": 20
  },
  {
    "kind": "question",
    "round": 1,
    "keyName": "SMART",
    "category": "Big Mouth I · Cấu tạo",
    "title": "Câu 4: Phần đuôi giúp mô hình Big Mouth như thế nào?",
    "prompt": "Phần đuôi giúp mô hình Big Mouth như thế nào?",
    "options": [
      {
        "id": "A",
        "label": "Điều khiển góc quay của hàm"
      },
      {
        "id": "B",
        "label": "Cấp điện cho controller"
      },
      {
        "id": "C",
        "label": "Chọn ID của servo"
      },
      {
        "id": "D",
        "label": "Cân đối và hoàn chỉnh mô hình"
      }
    ],
    "correct": [
      "D"
    ],
    "answer": "D. Cân đối và hoàn chỉnh mô hình",
    "explanation": "Phần đuôi giúp cân đối và hoàn chỉnh mô hình, không điều khiển góc quay servo.",
    "time": 20
  },
  {
    "kind": "question",
    "round": 1,
    "keyName": "SMART",
    "category": "Big Mouth I · Cấu tạo",
    "title": "Câu 5: Khi miệng Big Mouth mở và đóng, hàm chuyển động như thế nào?",
    "prompt": "Khi miệng Big Mouth mở và đóng, hàm chuyển động như thế nào?",
    "options": [
      {
        "id": "A",
        "label": "Trượt thẳng ra khỏi phần đầu"
      },
      {
        "id": "B",
        "label": "Quay quanh một khớp"
      },
      {
        "id": "C",
        "label": "Quay cả thân robot"
      },
      {
        "id": "D",
        "label": "Co ngắn rồi dài ra"
      }
    ],
    "correct": [
      "B"
    ],
    "answer": "B. Quay quanh một khớp",
    "explanation": "Hàm quay quanh một khớp. Khi servo đổi góc, cơ cấu hàm mở hoặc đóng.",
    "time": 20
  },
  {
    "kind": "round",
    "round": 2,
    "keyName": "AI",
    "title": "Lắp ráp và kiểm tra an toàn",
    "subtitle": "Servo, dây kết nối và khớp hàm",
    "mission": "Chọn cách lắp ráp và kiểm tra để mô hình chuyển động an toàn."
  },
  {
    "kind": "question",
    "round": 2,
    "keyName": "AI",
    "category": "Big Mouth I · Lắp ráp an toàn",
    "title": "Câu 6: Servo trong Big Mouth có nhiệm vụ chính gì?",
    "prompt": "Servo trong Big Mouth có nhiệm vụ chính gì?",
    "options": [
      {
        "id": "A",
        "label": "Phát sáng khi miệng mở"
      },
      {
        "id": "B",
        "label": "Giữ các linh kiện trong khay"
      },
      {
        "id": "C",
        "label": "Tạo chuyển động mở và đóng hàm"
      },
      {
        "id": "D",
        "label": "Làm đuôi cân đối với thân"
      }
    ],
    "correct": [
      "C"
    ],
    "answer": "C. Tạo chuyển động mở và đóng hàm",
    "explanation": "Servo tạo chuyển động quay để cơ cấu hàm mở và đóng miệng.",
    "time": 20
  },
  {
    "kind": "question",
    "round": 2,
    "keyName": "AI",
    "category": "Big Mouth I · Lắp ráp an toàn",
    "title": "Câu 7: Trước khi lắp servo vào cơ cấu, cần làm gì theo hướng dẫn?",
    "prompt": "Trước khi lắp servo vào cơ cấu, cần làm gì theo hướng dẫn?",
    "options": [
      {
        "id": "A",
        "label": "Reset servo về vị trí ban đầu"
      },
      {
        "id": "B",
        "label": "Ép trục servo quay bằng tay"
      },
      {
        "id": "C",
        "label": "Kéo căng dây servo"
      },
      {
        "id": "D",
        "label": "Chạy servo liên tục"
      }
    ],
    "correct": [
      "A"
    ],
    "answer": "A. Reset servo về vị trí ban đầu",
    "explanation": "Reset servo về vị trí ban đầu theo hướng dẫn trước khi lắp. Không ép trục servo quay bằng tay.",
    "time": 20
  },
  {
    "kind": "question",
    "round": 2,
    "keyName": "AI",
    "category": "Big Mouth I · Lắp ráp an toàn",
    "title": "Câu 8: Dây nào nối servo với controller trong bài học?",
    "prompt": "Dây nào nối servo với controller trong bài học?",
    "options": [
      {
        "id": "A",
        "label": "Dây 1-pin"
      },
      {
        "id": "B",
        "label": "Dây 2-pin"
      },
      {
        "id": "C",
        "label": "Dây 4-pin"
      },
      {
        "id": "D",
        "label": "Dây 3-pin"
      }
    ],
    "correct": [
      "D"
    ],
    "answer": "D. Dây 3-pin",
    "explanation": "Bài học sử dụng dây 3-pin nối servo với controller. Cần cắm chắc và đúng chiều.",
    "time": 20
  },
  {
    "kind": "question",
    "round": 2,
    "keyName": "AI",
    "category": "Big Mouth I · Lắp ráp an toàn",
    "title": "Câu 9: Một linh kiện khó lắp vào và cần ép rất mạnh. Em nên làm gì?",
    "prompt": "Một linh kiện khó lắp vào và cần ép rất mạnh. Em nên làm gì?",
    "options": [
      {
        "id": "A",
        "label": "Tiếp tục ấn mạnh hơn"
      },
      {
        "id": "B",
        "label": "Đổi sang một chốt lớn hơn"
      },
      {
        "id": "C",
        "label": "Dừng lại và kiểm tra hướng lắp"
      },
      {
        "id": "D",
        "label": "Bỏ qua bước đó và chạy robot"
      }
    ],
    "correct": [
      "C"
    ],
    "answer": "C. Dừng lại và kiểm tra hướng lắp",
    "explanation": "Khi linh kiện khó lắp, dừng lại và kiểm tra hướng lắp. Ép mạnh có thể làm hỏng chi tiết.",
    "time": 30
  },
  {
    "kind": "question",
    "round": 2,
    "keyName": "AI",
    "category": "Big Mouth I · Lắp ráp an toàn",
    "title": "Câu 10: Khớp hàm bị kẹt. Trước khi chạy chương trình, em nên làm gì?",
    "prompt": "Khớp hàm bị kẹt. Trước khi chạy chương trình, em nên làm gì?",
    "options": [
      {
        "id": "A",
        "label": "Tăng góc mở miệng"
      },
      {
        "id": "B",
        "label": "Báo giáo viên và kiểm tra chỗ kẹt"
      },
      {
        "id": "C",
        "label": "Giảm thời gian chuyển động"
      },
      {
        "id": "D",
        "label": "Cho robot mở và đóng liên tục"
      }
    ],
    "correct": [
      "B"
    ],
    "answer": "B. Báo giáo viên và kiểm tra chỗ kẹt",
    "explanation": "Cần báo giáo viên và kiểm tra chỗ kẹt trước khi chạy. Tăng góc hoặc chạy liên tục có thể làm servo bị ép.",
    "time": 30
  },
  {
    "kind": "round",
    "round": 3,
    "keyName": "IMPACT",
    "title": "Lập trình miệng robot",
    "subtitle": "ID servo, góc quay và thời gian",
    "mission": "Chọn đúng servo và điều khiển tốc độ, trình tự mở và đóng miệng."
  },
  {
    "kind": "question",
    "round": 3,
    "keyName": "IMPACT",
    "category": "Big Mouth II · Lập trình servo",
    "title": "Câu 11: Chọn đúng ID servo giúp chương trình làm gì?",
    "prompt": "Chọn đúng ID servo giúp chương trình làm gì?",
    "options": [
      {
        "id": "A",
        "label": "Điều khiển đúng servo cần dùng"
      },
      {
        "id": "B",
        "label": "Làm dây kết nối chắc hơn"
      },
      {
        "id": "C",
        "label": "Thay đổi hình dạng phần đầu"
      },
      {
        "id": "D",
        "label": "Giữ mô hình đứng vững hơn"
      }
    ],
    "correct": [
      "A"
    ],
    "answer": "A. Điều khiển đúng servo cần dùng",
    "explanation": "ID giúp chương trình chọn đúng servo. Chọn nhầm ID có thể khiến cơ cấu hàm không chuyển động.",
    "time": 30
  },
  {
    "kind": "question",
    "round": 3,
    "keyName": "IMPACT",
    "category": "Big Mouth II · Lập trình servo",
    "title": "Câu 12: Trong bài Big Mouth II, khối lệnh nào điều khiển góc quay servo?",
    "prompt": "Trong bài Big Mouth II, khối lệnh nào điều khiển góc quay servo?",
    "options": [
      {
        "id": "A",
        "label": "Khối chờ"
      },
      {
        "id": "B",
        "label": "Khối điều khiển LED"
      },
      {
        "id": "C",
        "label": "Khối phát âm thanh"
      },
      {
        "id": "D",
        "label": "Khối rotate servo"
      }
    ],
    "correct": [
      "D"
    ],
    "answer": "D. Khối rotate servo",
    "explanation": "Khối rotate servo điều khiển góc quay của servo đã chọn.",
    "time": 30
  },
  {
    "kind": "question",
    "round": 3,
    "keyName": "IMPACT",
    "category": "Big Mouth II · Lập trình servo",
    "title": "Câu 13: Cùng một góc quay, thời gian chuyển động nào giúp servo quay nhanh nhất?",
    "prompt": "Cùng một góc quay, thời gian chuyển động nào giúp servo quay nhanh nhất?",
    "options": [
      {
        "id": "A",
        "label": "800 ms"
      },
      {
        "id": "B",
        "label": "1200 ms"
      },
      {
        "id": "C",
        "label": "400 ms"
      },
      {
        "id": "D",
        "label": "Cả ba nhanh như nhau"
      }
    ],
    "correct": [
      "C"
    ],
    "answer": "C. 400 ms",
    "explanation": "Với cùng góc quay, thời gian chuyển động 400 ms ngắn nhất nên servo quay nhanh nhất trong ba lựa chọn.",
    "time": 30
  },
  {
    "kind": "question",
    "round": 3,
    "keyName": "IMPACT",
    "category": "Big Mouth II · Lập trình servo",
    "title": "Câu 14: Giữ nguyên góc quay, tăng thời gian chuyển động từ 800 ms lên 1200 ms sẽ làm gì?",
    "prompt": "Giữ nguyên góc quay, tăng thời gian chuyển động từ 800 ms lên 1200 ms sẽ làm gì?",
    "options": [
      {
        "id": "A",
        "label": "Servo quay nhanh hơn"
      },
      {
        "id": "B",
        "label": "Servo quay chậm hơn"
      },
      {
        "id": "C",
        "label": "Servo quay tới góc lớn hơn"
      },
      {
        "id": "D",
        "label": "Servo đổi sang ID khác"
      }
    ],
    "correct": [
      "B"
    ],
    "answer": "B. Servo quay chậm hơn",
    "explanation": "Giữ nguyên góc quay nhưng tăng thời gian chuyển động khiến servo đi cùng hành trình chậm hơn. Đây là thời gian chuyển động, không phải thời gian chờ.",
    "time": 30
  },
  {
    "kind": "question",
    "round": 3,
    "keyName": "IMPACT",
    "category": "Big Mouth II · Lập trình servo",
    "title": "Câu 15: Chuỗi lệnh nào giúp robot mở miệng, giữ mở một lúc rồi đóng?",
    "prompt": "Chuỗi lệnh nào giúp robot mở miệng, giữ mở một lúc rồi đóng?",
    "options": [
      {
        "id": "A",
        "label": "Mở miệng - chờ - đóng miệng"
      },
      {
        "id": "B",
        "label": "Đóng miệng - chờ - mở miệng"
      },
      {
        "id": "C",
        "label": "Chờ - mở miệng - mở miệng"
      },
      {
        "id": "D",
        "label": "Mở miệng - đóng miệng - chờ"
      }
    ],
    "correct": [
      "A"
    ],
    "answer": "A. Mở miệng - chờ - đóng miệng",
    "explanation": "Mở miệng, chờ rồi đóng miệng giúp robot giữ miệng mở một lúc trước khi đóng.",
    "time": 30
  },
  {
    "kind": "round",
    "round": 4,
    "keyName": "CORE",
    "title": "Thử nghiệm và xử lý lỗi",
    "subtitle": "Quan sát, tìm nguyên nhân và điều chỉnh",
    "mission": "Phân biệt lệnh chờ, lỗi ID, dây lỏng và góc quay chưa phù hợp."
  },
  {
    "kind": "question",
    "round": 4,
    "keyName": "CORE",
    "category": "Big Mouth II · Xử lý lỗi",
    "title": "Câu 16: Lệnh chờ giữa lệnh mở và đóng giúp robot làm gì?",
    "prompt": "Lệnh chờ giữa lệnh mở và đóng giúp robot làm gì?",
    "options": [
      {
        "id": "A",
        "label": "Đổi ID servo tự động"
      },
      {
        "id": "B",
        "label": "Tăng góc mở miệng"
      },
      {
        "id": "C",
        "label": "Làm dây servo bớt lỏng"
      },
      {
        "id": "D",
        "label": "Giữ miệng mở một lúc trước khi đóng"
      }
    ],
    "correct": [
      "D"
    ],
    "answer": "D. Giữ miệng mở một lúc trước khi đóng",
    "explanation": "Lệnh chờ trì hoãn lệnh đóng, giúp giữ miệng mở. Nó không đổi ID hay tăng góc quay.",
    "time": 30
  },
  {
    "kind": "question",
    "round": 4,
    "keyName": "CORE",
    "category": "Big Mouth II · Xử lý lỗi",
    "title": "Câu 17: Miệng không chạy vì chương trình chọn nhầm ID. Em cần sửa gì?",
    "prompt": "Miệng không chạy vì chương trình chọn nhầm ID. Em cần sửa gì?",
    "options": [
      {
        "id": "A",
        "label": "Tăng thời gian chờ"
      },
      {
        "id": "B",
        "label": "Chọn đúng ID của servo điều khiển hàm"
      },
      {
        "id": "C",
        "label": "Đổi màu LED"
      },
      {
        "id": "D",
        "label": "Lắp thêm phần đuôi"
      }
    ],
    "correct": [
      "B"
    ],
    "answer": "B. Chọn đúng ID của servo điều khiển hàm",
    "explanation": "Chọn lại đúng ID của servo điều khiển hàm, rồi chạy thử để kiểm tra.",
    "time": 30
  },
  {
    "kind": "question",
    "round": 4,
    "keyName": "CORE",
    "category": "Big Mouth II · Xử lý lỗi",
    "title": "Câu 18: Em thấy dây 3-pin nối servo bị lỏng. Cách xử lý phù hợp là gì?",
    "prompt": "Em thấy dây 3-pin nối servo bị lỏng. Cách xử lý phù hợp là gì?",
    "options": [
      {
        "id": "A",
        "label": "Tăng góc quay trong chương trình"
      },
      {
        "id": "B",
        "label": "Giảm thời gian chuyển động"
      },
      {
        "id": "C",
        "label": "Dừng chạy, cắm lại dây chắc và đúng chiều"
      },
      {
        "id": "D",
        "label": "Cho servo mở miệng nhiều lần"
      }
    ],
    "correct": [
      "C"
    ],
    "answer": "C. Dừng chạy, cắm lại dây chắc và đúng chiều",
    "explanation": "Dừng chạy, cắm lại dây 3-pin chắc và đúng chiều. Thay góc hay thời gian trong code không sửa được dây lỏng.",
    "time": 30
  },
  {
    "kind": "question",
    "round": 4,
    "keyName": "CORE",
    "category": "Big Mouth II · Xử lý lỗi",
    "title": "Câu 19: Miệng mở quá rộng khiến servo bị ép ở cuối hành trình. Em nên làm gì?",
    "prompt": "Miệng mở quá rộng khiến servo bị ép ở cuối hành trình. Em nên làm gì?",
    "options": [
      {
        "id": "A",
        "label": "Dừng chạy và chỉnh góc về mức an toàn"
      },
      {
        "id": "B",
        "label": "Tăng góc mở để hàm đi xa hơn"
      },
      {
        "id": "C",
        "label": "Chỉ đổi tên dự án"
      },
      {
        "id": "D",
        "label": "Giữ góc cũ và chạy liên tục"
      }
    ],
    "correct": [
      "A"
    ],
    "answer": "A. Dừng chạy và chỉnh góc về mức an toàn",
    "explanation": "Dừng chạy và chỉnh góc về mức an toàn để cơ cấu không bị ép ở cuối hành trình.",
    "time": 30
  },
  {
    "kind": "question",
    "round": 4,
    "keyName": "CORE",
    "category": "Big Mouth II · Xử lý lỗi",
    "title": "Câu 20: Sau khi lập trình mở rồi đóng miệng, em cần làm gì theo nhiệm vụ?",
    "prompt": "Sau khi lập trình mở rồi đóng miệng, em cần làm gì theo nhiệm vụ?",
    "options": [
      {
        "id": "A",
        "label": "Chạy một lần rồi cất ngay"
      },
      {
        "id": "B",
        "label": "Chỉ đọc code, không chạy robot"
      },
      {
        "id": "C",
        "label": "Đổi ID sau mỗi lần chạy"
      },
      {
        "id": "D",
        "label": "Chạy thử 3 lần và quan sát góc phù hợp"
      }
    ],
    "correct": [
      "D"
    ],
    "answer": "D. Chạy thử 3 lần và quan sát góc phù hợp",
    "explanation": "Chạy thử ba lần, quan sát chuyển động và ghi nhận góc phù hợp để kiểm tra mô hình hoạt động ổn định.",
    "time": 30
  },
  {
    "kind": "results",
    "title": "Hoàn thành thử thách Big Mouth!"
  }
];

export const quizQuestions = gameScreens.filter(
  (screen): screen is QuestionScreen => screen.kind === "question",
);
