/* Config as Code: toàn bộ nội dung nằm ở đây. Đổi file này = thiệp mới. */
(function (G) {
  'use strict';
  G.CONFIG = {
    teacher: { defaultName: 'Thầy/Cô', maxNameLength: 40 },
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
    bootLines: [
      '$ kubectl apply -f gratitude.yaml',
      '> Đang khởi tạo lòng biết ơn... [OK]',
      '> Loading: {name}... found ✓'
    ],
    // TODO: thay bằng lời chúc thật
    commits: [
      { msg: 'feat: thêm kiên nhẫn vào mọi bài giảng', text: 'Cảm ơn {name} đã giảng lại lần thứ ba mà vẫn mỉm cười.' },
      { msg: 'fix: sửa lỗi tư duy', text: '{name} không chỉ sửa code, mà còn sửa cách chúng em nghĩ.' },
      { msg: 'revert: không bao giờ revert học trò', text: '{name} chưa bao giờ bỏ rơi ai.' }
    ],
    hidden: [],
    finale: 'Chúc {name} uptime 100% sức khỏe, zero downtime niềm vui, và không bao giờ phải rollback tuổi trẻ.'
  };
})(window.GP = window.GP || {});
