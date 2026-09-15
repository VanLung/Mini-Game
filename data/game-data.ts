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

const smartOptions: Option[] = [
  { id: "A", label: "Thiết bị thông minh" },
  { id: "B", label: "Chỉ tự động hóa" },
  { id: "C", label: "Thiết bị số thông thường" },
];

const aiOptions: Option[] = [
  { id: "A", label: "Có sử dụng AI" },
  { id: "B", label: "Chỉ tự động hóa" },
  { id: "C", label: "Chưa đủ thông tin" },
];

export const roundMeta = [
  { round: 1, keyName: "SMART", title: "Smart thật hay chỉ gắn mác?" },
  { round: 2, keyName: "AI", title: "AI thật hay đang diễn?" },
  { round: 3, keyName: "IMPACT", title: "Tin học đang làm nghề gì?" },
  { round: 4, keyName: "CORE", title: "Giải mã lõi Tin học" },
] as const;

export const gameScreens: GameScreen[] = [
  {
    kind: "round",
    round: 1,
    keyName: "SMART",
    title: "Smart thật hay chỉ gắn mác?",
    subtitle: "Nhìn tính năng, đừng nhìn tên gọi",
    mission: "Phân biệt thiết bị thông minh, thiết bị tự động và thiết bị số thông thường.",
  },
  {
    kind: "question",
    round: 1,
    keyName: "SMART",
    category: "Nhận diện thiết bị",
    title: "Robot hút bụi tự lập bản đồ",
    prompt: "Robot dùng cảm biến để lập bản đồ căn phòng, tránh vật cản và tự điều chỉnh đường đi. Thiết bị này thuộc nhóm nào?",
    options: smartOptions,
    correct: ["A"],
    answer: "A. Thiết bị thông minh",
    explanation: "Thiết bị thu nhận dữ liệu từ cảm biến, xử lí thông tin và tự thích ứng với môi trường trong một mức độ nhất định.",
    time: 20,
  },
  {
    kind: "question",
    round: 1,
    keyName: "SMART",
    category: "Nhận diện thiết bị",
    title: "Nồi cơm điện tự ngắt",
    prompt: "Một nồi cơm điện cơ học tự chuyển sang chế độ giữ ấm khi cơm chín. Nên xếp thiết bị này vào nhóm nào?",
    options: smartOptions,
    correct: ["B"],
    answer: "B. Chỉ tự động hóa",
    explanation: "Nồi thực hiện một cơ chế điều khiển định trước; khả năng thu thập, xử lí và thích ứng với dữ liệu rất hạn chế.",
    time: 20,
  },
  {
    kind: "question",
    round: 1,
    keyName: "SMART",
    category: "Nhận diện thiết bị",
    title: "Camera biết lúc nào cần báo động",
    prompt: "Camera phát hiện chuyển động, tự chọn đoạn cần ghi và gửi cảnh báo đến điện thoại. Thiết bị này thuộc nhóm nào?",
    options: smartOptions,
    correct: ["A"],
    answer: "A. Thiết bị thông minh",
    explanation: "Camera tự thu nhận, chọn lọc, xử lí dữ liệu và phản hồi. Kết nối mạng hỗ trợ trao đổi dữ liệu nhưng không phải tiêu chí duy nhất.",
    time: 20,
  },
  {
    kind: "question",
    round: 1,
    keyName: "SMART",
    category: "Công nghiệp 4.0",
    title: "Vì sao thiết bị thông minh giữ vai trò chủ chốt?",
    prompt: "Trong Cách mạng công nghiệp 4.0, thiết bị thông minh đặc biệt quan trọng vì lí do nào?",
    options: [
      { id: "A", label: "Là thành phần chủ chốt của IoT, giúp tự động thu thập và trao đổi dữ liệu" },
      { id: "B", label: "Chỉ dùng để thay đổi hình thức bên ngoài của sản phẩm" },
      { id: "C", label: "Luôn hoạt động mà không cần phần mềm" },
      { id: "D", label: "Có thể thay thế con người trong mọi công việc" },
    ],
    correct: ["A"],
    answer: "A. Là thành phần chủ chốt của IoT",
    explanation: "Công nghiệp 4.0 dựa trên công nghệ số và các công nghệ thông minh; thiết bị thông minh giúp hệ thống IoT thu thập, trao đổi và xử lí dữ liệu tự động trên diện rộng.",
    time: 25,
  },
  {
    kind: "round",
    round: 2,
    keyName: "AI",
    title: "AI thật hay đang diễn?",
    subtitle: "Tự động chưa chắc là trí tuệ nhân tạo",
    mission: "Nhận biết khả năng mô phỏng hành vi trí tuệ và tránh gắn nhãn AI cho mọi chương trình.",
  },
  {
    kind: "question",
    round: 2,
    keyName: "AI",
    category: "AI hay tự động",
    title: "Camera ghi hình 24/7",
    prompt: "Camera chỉ ghi hình liên tục vào thẻ nhớ và không phân tích nội dung. Ta có thể kết luận camera sử dụng AI không?",
    options: aiOptions,
    correct: ["B"],
    answer: "B. Chỉ tự động hóa",
    explanation: "Việc tự ghi hình theo chương trình chưa thể hiện khả năng nhận dạng, học hoặc suy luận của AI.",
    time: 20,
  },
  {
    kind: "question",
    round: 2,
    keyName: "AI",
    category: "AI hay tự động",
    title: "Nhận diện biển số",
    prompt: "Phần mềm đọc hình ảnh từ camera, xác định biển số và phân loại phương tiện. Đây là trường hợp nào?",
    options: aiOptions,
    correct: ["A"],
    answer: "A. Có sử dụng AI",
    explanation: "Nhận dạng hình ảnh và kí tự là những ứng dụng tiêu biểu của trí tuệ nhân tạo.",
    time: 20,
  },
  {
    kind: "question",
    round: 2,
    keyName: "AI",
    category: "AI hay tự động",
    title: "Công thức SUM biết suy nghĩ?",
    prompt: "Bảng tính tự động cộng điểm bằng công thức SUM. Chức năng này có phải AI không?",
    options: aiOptions,
    correct: ["B"],
    answer: "B. Chỉ tự động hóa",
    explanation: "Công thức thực hiện phép tính theo quy tắc đã xác định. Tự động thực hiện thuật toán không đồng nghĩa với AI.",
    time: 20,
  },
  {
    kind: "round",
    round: 3,
    keyName: "IMPACT",
    title: "Tin học đang làm nghề gì?",
    subtitle: "Một ngành học, rất nhiều tác động",
    mission: "Ghép tình huống thực tế với đóng góp phù hợp của Tin học đối với xã hội.",
  },
  {
    kind: "question",
    round: 3,
    keyName: "IMPACT",
    category: "Vai trò xã hội",
    title: "Hồ sơ học sinh số",
    prompt: "Nhà trường dùng phần mềm để lưu hồ sơ, điểm và kết quả rèn luyện. Đây là đóng góp nào của Tin học?",
    options: [
      { id: "A", label: "Quản lí" },
      { id: "B", label: "Tự động hóa sản xuất" },
      { id: "C", label: "Giao tiếp cộng đồng" },
      { id: "D", label: "Mô phỏng khoa học" },
    ],
    correct: ["A"],
    answer: "A. Quản lí",
    explanation: "Hệ thống giúp tổ chức, cập nhật, tra cứu và xử lí nghiệp vụ nhanh chóng, chính xác hơn.",
    time: 25,
  },
  {
    kind: "question",
    round: 3,
    keyName: "IMPACT",
    category: "Vai trò xã hội",
    title: "Dự báo đường đi của bão",
    prompt: "Máy tính xử lí dữ liệu khí tượng và mô phỏng đường đi của bão. Đây là đóng góp nổi bật nào?",
    options: [
      { id: "A", label: "Giải trí" },
      { id: "B", label: "Giải quyết bài toán khoa học và kĩ thuật" },
      { id: "C", label: "Quản lí bán hàng" },
      { id: "D", label: "Giao tiếp cộng đồng" },
    ],
    correct: ["B"],
    answer: "B. Giải quyết bài toán khoa học và kĩ thuật",
    explanation: "Khả năng tính toán nhanh giúp máy tính hỗ trợ mô phỏng, kiểm nghiệm và dự báo.",
    time: 25,
  },
  {
    kind: "question",
    round: 3,
    keyName: "IMPACT",
    category: "Vai trò xã hội",
    title: "Lớp học không còn bị giới hạn bởi căn phòng",
    prompt: "Học sinh và giáo viên có thể học, giao bài và cộng tác trực tuyến. Điều này thể hiện vai trò nào rõ nhất?",
    options: [
      { id: "A", label: "Thay đổi phương thức học tập và làm việc" },
      { id: "B", label: "Chỉ làm máy tính chạy nhanh hơn" },
      { id: "C", label: "Thay thế hoàn toàn giáo viên" },
      { id: "D", label: "Chỉ phục vụ giải trí" },
    ],
    correct: ["A"],
    answer: "A. Thay đổi phương thức học tập và làm việc",
    explanation: "Tin học mở rộng không gian, thời gian và cách thức cộng tác; nhưng không tự động thay thế vai trò của con người.",
    time: 25,
  },
  {
    kind: "question",
    round: 3,
    keyName: "IMPACT",
    category: "Vai trò xã hội",
    title: "Robot lắp ráp không biết mệt",
    prompt: "Nhà máy dùng robot để lắp ráp linh kiện theo quy trình, giúp tăng tốc độ và độ chính xác. Đây là đóng góp nào của Tin học?",
    options: [
      { id: "A", label: "Tự động hóa" },
      { id: "B", label: "Giao tiếp cộng đồng" },
      { id: "C", label: "Giải trí" },
      { id: "D", label: "Soạn thảo văn bản" },
    ],
    correct: ["A"],
    answer: "A. Tự động hóa",
    explanation: "Máy tính và phần mềm điều khiển giúp nhiều quy trình được thực hiện tự động, nhanh và ổn định hơn.",
    time: 25,
  },
  {
    kind: "question",
    round: 3,
    keyName: "IMPACT",
    category: "Vai trò xã hội",
    title: "Một thông điệp, cả cộng đồng cùng biết",
    prompt: "Email, diễn đàn và mạng xã hội thể hiện rõ nhất đóng góp nào của Tin học?",
    options: [
      { id: "A", label: "Giao tiếp cộng đồng" },
      { id: "B", label: "Tự động hóa nhà máy" },
      { id: "C", label: "Quản lí phần cứng" },
      { id: "D", label: "Mô phỏng thời tiết" },
    ],
    correct: ["A"],
    answer: "A. Giao tiếp cộng đồng",
    explanation: "Tin học giúp con người trao đổi thông tin nhanh và trên phạm vi rộng; đồng thời người dùng phải kiểm tra nguồn tin và bảo vệ dữ liệu cá nhân.",
    time: 25,
  },
  {
    kind: "round",
    round: 4,
    keyName: "CORE",
    title: "Giải mã lõi Tin học",
    subtitle: "Thành tựu không chỉ là những thiết bị nhìn thấy được",
    mission: "Nhận diện các nền tảng làm nên xã hội số: hệ điều hành, mạng, lập trình, cơ sở dữ liệu, AI và dữ liệu lớn.",
  },
  {
    kind: "question",
    round: 4,
    keyName: "CORE",
    category: "Thành tựu Tin học",
    title: "Ai quản lí tài nguyên máy tính?",
    prompt: "Thành tựu nào quản lí phần cứng, phần mềm, tiến trình và cung cấp giao diện làm việc cho người dùng?",
    options: [
      { id: "A", label: "Hệ điều hành" },
      { id: "B", label: "Mạng xã hội" },
      { id: "C", label: "Máy tìm kiếm" },
      { id: "D", label: "Trình chiếu" },
    ],
    correct: ["A"],
    answer: "A. Hệ điều hành",
    explanation: "Hệ điều hành là lớp phần mềm nền tảng quản lí tài nguyên và tạo môi trường cho ứng dụng hoạt động.",
    time: 25,
  },
  {
    kind: "question",
    round: 4,
    keyName: "CORE",
    category: "Thành tựu Tin học",
    title: "Kho dữ liệu có người quản lí",
    prompt: "Công cụ nào giúp tổ chức, cập nhật và truy vấn dữ liệu mà không phụ thuộc vào một bài toán duy nhất?",
    options: [
      { id: "A", label: "Hệ quản trị cơ sở dữ liệu" },
      { id: "B", label: "Trình duyệt web" },
      { id: "C", label: "Ứng dụng vẽ" },
      { id: "D", label: "Bộ gõ tiếng Việt" },
    ],
    correct: ["A"],
    answer: "A. Hệ quản trị cơ sở dữ liệu",
    explanation: "Hệ quản trị cơ sở dữ liệu cung cấp công cụ lưu trữ, cập nhật, tìm kiếm và bảo vệ dữ liệu có tổ chức.",
    time: 25,
  },
  {
    kind: "question",
    round: 4,
    keyName: "CORE",
    category: "Thành tựu Tin học",
    title: "Cầu nối giữa con người và máy tính",
    prompt: "Python, C và Pascal thuộc nhóm thành tựu nào?",
    options: [
      { id: "A", label: "Ngôn ngữ lập trình bậc cao" },
      { id: "B", label: "Hệ điều hành" },
      { id: "C", label: "Thiết bị thông minh" },
      { id: "D", label: "Hệ quản trị cơ sở dữ liệu" },
    ],
    correct: ["A"],
    answer: "A. Ngôn ngữ lập trình bậc cao",
    explanation: "Ngôn ngữ lập trình giúp con người mô tả thuật toán và xây dựng phần mềm bằng kí hiệu dễ sử dụng hơn mã máy.",
    time: 25,
  },
  {
    kind: "question",
    round: 4,
    keyName: "CORE",
    category: "Thành tựu Tin học",
    title: "Kết nối toàn cầu",
    prompt: "Thành tựu nào cho phép các máy tính và thiết bị trao đổi dữ liệu trên phạm vi rộng?",
    options: [
      { id: "A", label: "Mạng máy tính và Internet" },
      { id: "B", label: "Máy tính bỏ túi" },
      { id: "C", label: "Máy in" },
      { id: "D", label: "Ổ đĩa rời" },
    ],
    correct: ["A"],
    answer: "A. Mạng máy tính và Internet",
    explanation: "Các quy tắc truyền thông và hạ tầng mạng cho phép thiết bị trao đổi dữ liệu từ cục bộ đến toàn cầu.",
    time: 25,
  },
  {
    kind: "question",
    round: 4,
    keyName: "CORE",
    category: "Thành tựu Tin học",
    title: "Dữ liệu càng nhiều, giá trị càng lớn?",
    prompt: "Cặp công nghệ nào thường được dùng để phân tích lượng dữ liệu lớn, nhận dạng mẫu và hỗ trợ dự đoán?",
    options: [
      { id: "A", label: "Trí tuệ nhân tạo và dữ liệu lớn" },
      { id: "B", label: "Bàn phím và chuột" },
      { id: "C", label: "Máy in và máy quét" },
      { id: "D", label: "Bộ nhớ USB và đĩa quang" },
    ],
    correct: ["A"],
    answer: "A. Trí tuệ nhân tạo và dữ liệu lớn",
    explanation: "Giá trị không tự xuất hiện chỉ vì có nhiều dữ liệu; dữ liệu cần đúng, đủ và được xử lí bằng phương pháp phù hợp.",
    time: 25,
  },
  {
    kind: "boss",
    round: 5,
    keyName: "BOSS",
    title: "Boss cuối: Giải cứu cổng trường",
    prompt: "Cổng trường thường ùn tắc vào giờ cao điểm. Hãy thiết kế một hệ thống thông minh giúp giảm ùn tắc và tăng an toàn.",
    requirements: [
      "Thiết bị thu thập dữ liệu",
      "Dữ liệu cần thu thập",
      "Cách thiết bị kết nối",
      "Phần mềm xử lí dữ liệu",
      "Hành động của hệ thống",
      "Một lợi ích và một rủi ro",
    ],
    answer: [
      "Camera hoặc cảm biến đếm phương tiện, không nhất thiết nhận dạng khuôn mặt.",
      "Thu thập số lượng xe, thời điểm và vị trí ùn tắc.",
      "Truyền dữ liệu qua mạng đến hệ thống xử lí.",
      "Phần mềm phân tích mật độ giao thông và phát hiện bất thường.",
      "Điều chỉnh tín hiệu, cảnh báo hoặc đề xuất hướng di chuyển.",
      "Lợi ích: giảm ùn tắc, tăng an toàn. Rủi ro: lộ hình ảnh, vị trí hoặc quyết định sai do dữ liệu sai.",
    ],
    time: 90,
  },
  {
    kind: "results",
    title: "Cyber City đã được khôi phục!",
  },
];
