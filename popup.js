document.addEventListener("DOMContentLoaded", function () {
  const openButton = document.getElementById("openXcom");
  const optionsButton = document.getElementById("goToOptions");
  const autoScrollToggle = document.getElementById("autoScroll");
  const statusElement = document.getElementById("status");

  // Kiểm tra thông tin đăng nhập đã được cấu hình chưa
  chrome.storage.sync.get(
    ["username", "password", "autoScroll"],
    function (data) {
      if (data.username && data.password) {
        statusElement.textContent = "Đã cấu hình tài khoản: " + data.username;
      } else {
        statusElement.textContent = "Chưa cấu hình tài khoản";
      }

      // Thiết lập trạng thái toggle tự động cuộn
      if (data.autoScroll !== undefined) {
        autoScrollToggle.checked = data.autoScroll;
      }
    }
  );

  // Xử lý khi nhấn nút mở X.com
  openButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "openXcom" });
    window.close();
  });

  // Xử lý khi nhấn nút cài đặt
  optionsButton.addEventListener("click", function () {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Xử lý khi thay đổi trạng thái toggle
  autoScrollToggle.addEventListener("change", function () {
    chrome.storage.sync.set({ autoScroll: this.checked });

    // Gửi tin nhắn đến tất cả tab X.com đang mở
    chrome.tabs.query(
      { url: ["*://x.com/*", "*://twitter.com/*"] },
      function (tabs) {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {
            action: this.checked ? "startScrolling" : "stopScrolling",
          });
        }
      }.bind(this)
    );
  });
});
