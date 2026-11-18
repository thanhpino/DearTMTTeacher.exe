/* Config as Code: toàn bộ nội dung nằm ở đây. Đổi file này = thiệp mới. */
(function (G) {
  'use strict';
  G.CONFIG = {
    // {name} = tên đầy đủ; {title} = cách xưng hô (đổi "Thầy"/"Cô" tại đây nếu muốn)
    teacher: {
      defaultName: 'TS. Bùi Quy Anh',
      title: 'Thầy',
      maxNameLength: 40
    },
    colors: {
      bg: '#0b1f17', moss: '#2e7d4f', leaf: '#7bd88f',
      firefly: '#ffd166', terminal: '#4ee1c1', warn: '#ff6b6b'
    },
    // Mốc thời gian (giây) của 6 chặng pipeline
    stages: [
      { id: 'plant',   label: 'Plant',   start: 0,  end: 10 },
      { id: 'build',   label: 'Build',   start: 10, end: 16 },
      { id: 'test',    label: 'Test',    start: 16, end: 26 },
      { id: 'deploy',  label: 'Deploy',  start: 26, end: 38 },
      { id: 'monitor', label: 'Monitor', start: 38, end: 46 },
      { id: 'push',    label: 'Push',    start: 46, end: Infinity }
    ],

    // Cảnh 1: terminal. at = giây bắt đầu gõ, cps = ký tự/giây
    boot: [
      { at: 0.4, cps: 34, text: '$ kubectl apply -f gratitude.yaml' },
      { at: 2.0, cps: 40, text: '> Đang khởi tạo lòng biết ơn... [OK]', cls: 'ok' },
      { at: 3.6, cps: 40, text: '> Loading: {name}... found ✓', cls: 'ok' },
      { at: 5.6, cps: 30, text: '$ git commit -m "bài giảng đầu tiên"' }
    ],
    terminalFadeStart: 7,
    terminalFadeEnd: 9.5,

    // Cảnh 3: log trong bão. at = giây xuất hiện
    stormLogs: [
      { at: 17.5, cls: 'err',  text: 'ERROR: deadline 23:59, commit cuối chưa push' },
      { at: 19.5, cls: 'warn', text: 'WARN: bug lạ lúc 2h sáng, không biết do code hay do mình' },
      { at: 21.5, cls: 'err',  text: 'ERROR: đề tài EduPulse, kết quả chưa như kỳ vọng' },
      { at: 23.0, cls: 'warn', text: 'WARN: sinh viên lại quên bài (ví dụ: em)' },
      { at: 24.6, cls: 'ok',   text: 'All tests passed ✓  (nhờ có người ở lại review)' }
    ],

    // Cảnh 5: dashboard
    dashboard: [
      { label: 'Gratitude uptime', value: 100, suffix: '%' },
      { label: 'Bug đời em đã được {title} fix giùm', value: '∞' },
      { label: 'Incidents', value: 0 }
    ],
    blame: {
      cmd: '$ git blame sự-trưởng-thành-của-chúng-em',
      text: '{name}: người chịu trách nhiệm cho sự trưởng thành của chúng em.'
    },

    // Cảnh 6: mỗi đom đóm là một commit, chạm để đọc
    hint: '✦ Chạm vào đom đóm để đọc lời chúc',
    commits: [
      { msg: 'feat: thêm kiên nhẫn vào mọi buổi học',
        text: 'Cảm ơn {title} đã giảng lại lần thứ ba mà vẫn mỉm cười, như thể em là request đầu tiên trong ngày.' },
      { msg: 'docs: Điện toán đám mây, bản dễ hiểu',
        text: 'Em biết đến "đám mây" qua môn của {title}. Với em, đó không chỉ là hạ tầng, mà là cách {title} cho ta thấy điều lớn lao vẫn bắt đầu từ một container nhỏ.' },
      { msg: 'feat: khởi tạo EduPulse',
        text: 'Ngày em mang EduPulse đến, nó còn là một ý tưởng chưa chạy được. {title} không hỏi "sao chưa xong", mà hỏi "em cần gì để chạy tiếp?".' },
      { msg: 'chore: hướng dẫn nghiên cứu khoa học',
        text: '{title} dạy em rằng nghiên cứu không phải đoạn code một lần chạy đúng, mà là hàng chục lần fail rồi học cách đọc log cho kỹ.' },
      { msg: 'fix: sửa lỗi tư duy',
        text: '{title} không chỉ sửa bug trong code, mà còn sửa cách em đặt câu hỏi.' },
      { msg: 'perf: tối ưu đường đến thành công',
        text: 'Có những lối tắt em đã định đi. {title} chỉ nhẹ nhàng: "đường vòng đôi khi lại là đường tới nơi."' },
      { msg: 'hotfix: cứu deadline 23:59',
        text: 'Cảm ơn {title} đã ở lại đọc bản nháp muộn, khi cả hệ thống của em sắp sập.' },
      { msg: 'feat: auto-scaling niềm tin',
        text: 'Khi em tự nghi ngờ mình, {title} tin giúp em thêm một lần. Niềm tin ấy scale rất tốt.' },
      { msg: 'docs: câu thần chú của thầy',
        text: '"Các bạn cứ cố gắng thôi, có gì thầy sẽ hỗ trợ hết mình nhé!" Một câu thôi, mà là bản SLA chân thành nhất em từng được nhận, và {title} chưa một lần vi phạm.' },
      { msg: 'revert: không bao giờ revert học trò',
        text: '{title} chưa từng rollback ai. Mỗi lần em lỗi, {title} chọn fix forward.' },
      { msg: 'release: v1.0 em của hôm nay',
        text: 'Em của hôm nay là bản build từ rất nhiều commit của {title}. Em xin phép giữ nó thật cẩn thận.' }
    ],

    // Mở khóa bằng: sudo thank-you
    hidden: [
      'Có những điều không viết nổi bằng code: biết ơn là một trong số đó.',
      'Nếu cuộc đời là hệ thống phân tán, {title} là node em luôn muốn kết nối lại khi mất mạng.',
      'Dự án có thể kết thúc, nhưng những dòng {title} gieo vào em thì chạy mãi, không cần restart.',
      'Gửi {title}: em chưa nói đủ, nhưng em nhớ từng dòng {title} đã chỉ.'
    ],

    // Đoạn kết (chân thành, không đùa)
    finale: [
      'Cảm ơn {title} đã dạy em điện toán đám mây,',
      'và hơn thế, dạy em cách ở lại với một vấn đề khó cho tới khi nó sáng ra.',
      'Chúc {title} uptime 100% sức khỏe, zero downtime niềm vui,',
      'và không bao giờ phải rollback tuổi trẻ.'
    ],
    push: [
      { cmd: '$ git push origin gratitude', result: '✓ Pushed. Cảm ơn {title} {name}.' }
    ],
    notFound: '404: Lời cảm ơn not found → Redirecting to Lời cảm ơn found'
  };
})(window.GP = window.GP || {});
