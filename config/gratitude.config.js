/* Config as Code: toàn bộ nội dung nằm ở đây. Đổi file này = thiệp mới. */
(function (G) {
  'use strict';
  G.CONFIG = {
    // {name} = tên đầy đủ; {title} = cách xưng hô
    teacher: {
      defaultName: 'TS. Bùi Quy Anh',
      title: 'Thầy',
      maxNameLength: 40
    },
    author: 'Trương Minh Thành — Happy Teachers\' Day 20/11',
    colors: {
      bg: '#0b1f17', moss: '#2e7d4f', leaf: '#7bd88f',
      firefly: '#ffd166', terminal: '#4ee1c1', warn: '#ff6b6b'
    },
    // Mốc thời gian (giây) của 6 chặng pipeline
    stages: [
      { id: 'plant',   label: '1. Gieo hạt',  start: 0,  end: 10 },
      { id: 'build',   label: '2. Bén rễ',    start: 10, end: 16 },
      { id: 'test',    label: '3. Thử lửa',   start: 16, end: 26 },
      { id: 'deploy',  label: '4. Nở hoa',    start: 26, end: 38 },
      { id: 'monitor', label: '5. Dõi theo',  start: 38, end: 46 },
      { id: 'push',    label: '6. Tri ân',    start: 46, end: Infinity }
    ],

    // Cảnh 1: terminal. at = giây bắt đầu gõ, cps = ký tự/giây
    boot: [
      { at: 0.4, cps: 34, text: '$ kubectl apply -f long-biet-on.yaml' },
      { at: 2.0, cps: 40, text: '> Đang khởi tạo mạch nguồn tri ân... [HOÀN TẤT]', cls: 'ok' },
      { at: 3.6, cps: 40, text: '> Đang kết nối tới {title} {name}... Đã tìm thấy ✓', cls: 'ok' },
      { at: 5.6, cps: 30, text: '$ git commit -m "Bài giảng đầu tiên Thầy gieo xuống"' }
    ],
    terminalFadeStart: 7,
    terminalFadeEnd: 9.5,

    // Cảnh 3: log trong bão. at = giây xuất hiện
    stormLogs: [
      { at: 17.5, cls: 'err',  text: '[CẢNH BÁO] 23:59 — Hạn nộp bài cận kề, dòng suy nghĩ vẫn còn dang dở' },
      { at: 19.5, cls: 'warn', text: '[NHẮC NHỞ] 02:00 sáng — Lỗi lạ phát sinh, chưa rõ do thuật toán hay do lòng mình rối' },
      { at: 21.5, cls: 'err',  text: '[THỬ THÁCH] Đề tài EduPulse — Kết quả thực nghiệm chưa như kỳ vọng ban đầu' },
      { at: 23.0, cls: 'warn', text: '[NHẮC NHỞ] Sinh viên lại quên kiến thức cũ (trong đó có em)' },
      { at: 24.6, cls: 'ok',   text: '✓ Vượt qua mọi phép thử — Nhờ có {title} kiên nhẫn ở lại chỉ đường' }
    ],

    // Cảnh 5: dashboard
    dashboard: [
      { label: 'Độ bền bỉ lòng biết ơn', value: 100, suffix: '%' },
      { label: 'Lỗi đời em được {title} gỡ giúp', value: '∞' },
      { label: 'Lần {title} bỏ cuộc với học trò', value: 0 }
    ],
    blame: {
      cmd: '$ git blame su-truong-thanh-cua-chung-em',
      text: '{title} {name}: Người đứng sau sự trưởng thành của chúng em.'
    },

    // Cảnh 6: mỗi đom đóm là một lời chúc thuần Việt, chạm để đọc
    hint: '✦ Chạm vào đom đóm sáng trên tán cây để mở lời chúc',
    commits: [
      { msg: '[Khởi nguồn] Thêm thật nhiều kiên nhẫn vào mỗi buổi học',
        text: 'Cảm ơn {title} đã giảng lại đến lần thứ ba mà vẫn mỉm cười ấm áp, như thể câu hỏi ngây ngô của em là câu hỏi đầu tiên trong ngày.' },
      { msg: '[Hạ tầng Mây] Bài giảng Điện toán đám mây sáng rõ',
        text: 'Em biết đến thế giới Điện toán đám mây qua từng buổi học của {title}. Với em, đó không chỉ là kiến thức công nghệ, mà là bài học rằng mọi hệ thống vĩ đại đều bắt đầu từ những nền tảng giản dị và vững chắc.' },
      { msg: '[Ươm mầm] Khơi nhịp đập đầu tiên cho đề tài EduPulse',
        text: 'Ngày em mang ý tưởng EduPulse đến gặp {title}, mọi thứ còn ngổn ngang và chưa thành hình. {title} không hỏi "Sao chưa làm xong?", mà chỉ nhẹ nhàng hỏi: "Em cần {title} hỗ trợ gì để đi tiếp?".' },
      { msg: '[Nghiên cứu] Dẫn dắt những bước chân khoa học đầu tiên',
        text: '{title} dạy em rằng nghiên cứu khoa học không phải là viết một lần chạy đúng ngay, mà là đi qua hàng chục lần thất bại để học cách quan sát thật sâu và suy ngẫm thật kỹ.' },
      { msg: '[Gỡ rối] Sửa lại cách đặt câu hỏi trước mỗi bài toán khó',
        text: '{title} không chỉ chỉ ra lỗi sai trong từng dòng lệnh, mà còn kiên nhẫn nắn lại cách chúng em tư duy và nhìn nhận vấn đề từ gốc rễ.' },
      { msg: '[Tối ưu] Chỉ lối đi bền vững đến tương lai',
        text: 'Có những lúc em nóng vội muốn tìm đường tắt. {title} chỉ ôn tồn bảo: "Đường vòng mà chắc chắn đôi khi lại là con đường ngắn nhất để đi tới đích."' },
      { msg: '[Đêm khuya] Ở lại cùng những bản nháp lúc nửa đêm',
        text: 'Cảm ơn {title} đã dành thời gian đọc và góp ý cho những trang báo cáo gửi muộn, khi tinh thần của em tưởng chừng đã kiệt sức trước hạn nộp bài.' },
      { msg: '[Điểm tựa] Nhân rộng niềm tin khi học trò tự nghi ngờ',
        text: 'Mỗi khi em tự hoài nghi năng lực của chính mình, {title} lại tin tưởng em thêm một lần nữa. Chính niềm tin ấy của {title} đã nâng đỡ em đi qua những ngày khó nhất.' },
      { msg: '[Lời Thầy dặn] Câu thần chú tiếp sức cho chúng em',
        text: '“Các bạn cứ cố gắng thôi, có gì thầy sẽ hỗ trợ hết mình nhé!” — Chỉ một câu nói giản dị ấy thôi mà là lời cam kết ấm áp nhất em từng nhận được trên giảng đường.' },
      { msg: '[Bao dung] Không bao giờ quay lưng với lỗi lầm của trò',
        text: '{title} chưa từng bỏ rơi bất kỳ ai. Mỗi lần chúng em vấp ngã, {title} luôn chọn cách nâng dậy và cùng chúng em bước tiếp về phía trước.' },
      { msg: '[Thành quả] Phiên bản trưởng thành của em ngày hôm nay',
        text: 'Em của hôm nay được vun đắp từ biết bao bài giảng và sự tận tâm của {title}. Em xin phép giữ gìn những bài học ấy thật cẩn thận trên chặng đường sắp tới.' }
    ],

    // Mở khóa bằng: sudo thank-you
    hidden: [
      'Có những điều không một ngôn ngữ lập trình nào diễn tả trọn vẹn: lòng biết ơn dành cho {title} là một trong số đó.',
      'Nếu hành trình học tập là một mạng lưới rộng lớn, {title} chính là ngọn hải đăng mà em luôn tìm về mỗi khi mất phương hướng.',
      'Đề tài hay môn học rồi sẽ khép lại, nhưng cách {title} tận tụy với nghề và với học trò thì sẽ còn ở lại mãi trong em.',
      'Kính gửi {title} {name}: Em biết mình chưa nói lời cảm ơn đủ nhiều, nhưng em luôn ghi nhớ từng lời {title} đã chỉ dạy.'
    ],

    // Đoạn kết (chân thành, ngắt câu cân đối không rớt chữ lẻ)
    finale: [
      'Cảm ơn {title} đã truyền dạy cho em môn Điện toán đám mây và tận tình dìu dắt em trong đề tài nghiên cứu khoa học EduPulse.',
      'Hơn cả kiến thức, {title} đã dạy em lòng kiên trì ở lại với một bài toán khó cho tới khi tìm ra ánh sáng.',
      'Kính chúc {title} luôn dồi dào sức khỏe, trọn vẹn niềm vui trên bục giảng và mãi giữ ngọn lửa nhiệt huyết của tuổi trẻ.'
    ],
    push: [
      { cmd: '$ git push origin long-biet-on', result: '✓ Đã gửi trọn vẹn. Em cảm ơn {title} {name} rất nhiều!' }
    ],
    notFound: '404: Không tìm thấy lệnh này → Đang chuyển hướng về Lời tri ân dành cho {title}:'
  };
})(window.GP = window.GP || {});
