const visibleClass = 'screen--visible';

export function createScreens() {
  const elements = {
    loading: document.querySelector('#loading-screen'),
    start: document.querySelector('#start-screen'),
    pause: document.querySelector('#pause-screen'),
    result: document.querySelector('#result-screen'),
    scoreEntry: document.querySelector('#score-entry-screen'),
    leaderboard: document.querySelector('#leaderboard-screen')
  };
  const resultEyebrow = document.querySelector('#result-eyebrow');
  const resultTitle = document.querySelector('#result-title');
  const resultMessage = document.querySelector('#result-message');
  const resultScore = document.querySelector('#result-score');
  const scoreEntrySummary = document.querySelector('#score-entry-summary');
  const scoreEntryError = document.querySelector('#score-entry-error');
  const playerName = document.querySelector('#player-name');
  const leaderboardContent = document.querySelector('#leaderboard-content');

  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  const formatTime = seconds => {
    const total = Math.round(Number(seconds));
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  };

  function hideAll() {
    Object.values(elements).forEach(element => element.classList.remove(visibleClass));
  }
  return {
    show(name) { hideAll(); elements[name]?.classList.add(visibleClass); },
    hideAll,
    showResult(won, details = null) {
      resultEyebrow.textContent = won ? 'Chiến thắng' : 'Hết mạng';
      resultTitle.textContent = won ? 'Bạn đã thoát!' : 'Mê cung đã thắng';
      resultMessage.textContent = won ? 'Bạn đã tìm thấy lối ra khỏi bóng tối.' : 'Hãy ghi nhớ đường đi và thử lại từ đầu.';
      resultScore.textContent = won && details
        ? `${details.score.toLocaleString('vi-VN')} điểm · ${details.moves} bước · ${formatTime(details.timeSeconds)}`
        : '';
      this.show('result');
    },
    showScoreEntry(details) {
      scoreEntrySummary.textContent = `${details.score.toLocaleString('vi-VN')} điểm · ${details.moves} bước · ${formatTime(details.timeSeconds)}`;
      scoreEntryError.textContent = '';
      playerName.value = localStorage.getItem('game1_player_name') || '';
      this.show('scoreEntry');
      setTimeout(() => playerName.focus(), 0);
    },
    setScoreError(message) { scoreEntryError.textContent = message; },
    setScoreSaving(saving) {
      document.querySelector('#save-score-button').disabled = saving;
      document.querySelector('#save-score-button').textContent = saving ? 'Đang lưu…' : 'Lưu kỷ lục';
    },
    showLeaderboardLoading() {
      leaderboardContent.textContent = 'Đang tải…';
      this.show('leaderboard');
    },
    showLeaderboard(rows) {
      if (!rows.length) {
        leaderboardContent.innerHTML = '<p class="leaderboard-empty">Chưa có kỷ lục nào. Hãy trở thành người đầu tiên!</p>';
      } else {
        leaderboardContent.innerHTML = `<table class="leaderboard-table">
          <thead><tr><th>Hạng</th><th>Người chơi</th><th>Điểm</th><th>Bước</th><th>Thời gian</th><th>Ngày lập</th></tr></thead>
          <tbody>${rows.map(row => `<tr>
            <td>${Number(row.rank)}</td><td>${escapeHtml(row.player_name)}</td>
            <td>${Number(row.score).toLocaleString('vi-VN')}</td><td>${Number(row.moves)}</td>
            <td>${formatTime(row.time_seconds)}</td><td>${new Date(row.created_at).toLocaleDateString('vi-VN')}</td>
          </tr>`).join('')}</tbody></table>`;
      }
      this.show('leaderboard');
    },
    showLeaderboardError() {
      leaderboardContent.innerHTML = '<p class="leaderboard-error">Không thể tải bảng kỷ lục. Vui lòng thử lại.</p>';
      this.show('leaderboard');
    }
  };
}
