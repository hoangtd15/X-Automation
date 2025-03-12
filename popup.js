document.addEventListener("DOMContentLoaded", function () {
  const openButton = document.getElementById("openXcom");
  const optionsButton = document.getElementById("goToOptions");
  const autoScrollToggle = document.getElementById("autoScroll");
  const statusElement = document.getElementById("status");
  const speedOptions = document.getElementsByName("scrollSpeed");

  console.log("Popup script đã được tải");

  // Kiểm tra thông tin đăng nhập đã được cấu hình chưa
  chrome.storage.sync.get(
    ["username", "password", "autoScroll", "scrollSpeed"],
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

      // Thiết lập tốc độ cuộn
      if (data.scrollSpeed) {
        for (const option of speedOptions) {
          if (option.value === data.scrollSpeed.toString()) {
            option.checked = true;
            break;
          }
        }
      }
    }
  );

  // Xử lý khi nhấn nút mở X.com
  openButton.addEventListener("click", function () {
    console.log("Đã nhấn nút mở X.com");
    chrome.runtime.sendMessage({ action: "openXcom" });
    window.close();
  });

  // Xử lý khi nhấn nút cài đặt
  optionsButton.addEventListener("click", function () {
    console.log("Đã nhấn nút cài đặt");
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Xử lý khi thay đổi trạng thái toggle
  autoScrollToggle.addEventListener("change", function () {
    const isEnabled = this.checked;
    console.log("Đã thay đổi trạng thái tự động cuộn:", isEnabled);

    chrome.storage.sync.set({ autoScroll: isEnabled });

    // Gửi tin nhắn đến tất cả tab X.com đang mở
    chrome.tabs.query(
      { url: ["*://x.com/*", "*://twitter.com/*"] },
      function (tabs) {
        console.log("Tìm thấy", tabs.length, "tab X.com");
        for (const tab of tabs) {
          console.log("Gửi tin nhắn đến tab ID:", tab.id);
          chrome.tabs.sendMessage(
            tab.id,
            { action: isEnabled ? "startScrolling" : "stopScrolling" },
            function (response) {
              if (chrome.runtime.lastError) {
                console.log("Lỗi:", chrome.runtime.lastError.message);
              } else if (response) {
                console.log("Phản hồi:", response.status);
              }
            }
          );
        }
      }
    );
  });

  // Xử lý khi thay đổi tốc độ cuộn
  for (const option of speedOptions) {
    option.addEventListener("change", function () {
      if (this.checked) {
        const speed = this.value;
        console.log("Đã thay đổi tốc độ cuộn:", speed);

        // Lưu tốc độ cuộn
        chrome.storage.sync.set({ scrollSpeed: speed });

        // Gửi thông báo đến các tab X.com đang mở
        chrome.tabs.query(
          { url: ["*://x.com/*", "*://twitter.com/*"] },
          function (tabs) {
            for (const tab of tabs) {
              chrome.tabs.sendMessage(
                tab.id,
                { action: "setScrollSpeed", speed: parseInt(speed) },
                function (response) {
                  if (chrome.runtime.lastError) {
                    console.log("Lỗi:", chrome.runtime.lastError.message);
                  } else if (response) {
                    console.log("Phản hồi:", response.status);
                  }
                }
              );
            }
          }
        );
      }
    });
  }

  // Thêm một nút kiểm tra để xem extension có hoạt động không
  const testDiv = document.createElement("div");
  testDiv.style.marginTop = "10px";

  const testButton = document.createElement("button");
  testButton.textContent = "Kiểm tra hoạt động";
  testButton.addEventListener("click", function () {
    chrome.tabs.query(
      { url: ["*://x.com/*", "*://twitter.com/*"] },
      function (tabs) {
        if (tabs.length > 0) {
          statusElement.textContent = "Đang kiểm tra...";
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "testConnection" },
            function (response) {
              if (chrome.runtime.lastError) {
                statusElement.textContent =
                  "Lỗi kết nối: " + chrome.runtime.lastError.message;
              } else if (response) {
                statusElement.textContent = "Kết nối OK: " + response.status;
              } else {
                statusElement.textContent = "Không nhận được phản hồi";
              }
            }
          );
        } else {
          statusElement.textContent = "Không tìm thấy tab X.com nào đang mở";
        }
      }
    );
  });

  testDiv.appendChild(testButton);
  document.body.appendChild(testDiv);
});
