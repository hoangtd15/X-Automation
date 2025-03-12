// Lưu trữ ID của các tab
let mainTabId = null;
let adTabId = null;

// Lắng nghe các sự kiện từ popup và content scripts
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // Khi được yêu cầu mở X.com
  if (message.action === "openXcom") {
    // Kiểm tra xem đã có tab X.com nào đang mở không
    chrome.tabs.query(
      { url: ["*://x.com/*", "*://twitter.com/*"] },
      function (tabs) {
        if (tabs.length > 0) {
          // Nếu đã có tab X.com, chỉ cần chuyển đến tab đó
          chrome.tabs.update(tabs[0].id, { active: true });
          mainTabId = tabs[0].id;
        } else {
          // Nếu chưa có, mở tab mới đến X.com
          chrome.tabs.create({ url: "https://x.com/" }, function (tab) {
            mainTabId = tab.id;
          });
        }
      }
    );
  }

  // Khi content script yêu cầu ID của tab hiện tại
  else if (message.action === "getTabId") {
    sendResponse({ tabId: sender.tab.id });
    mainTabId = sender.tab.id;
  }

  // Khi được yêu cầu mở quảng cáo
  else if (message.action === "openAd") {
    // Lưu lại ID của tab chính
    if (message.mainTabId) {
      mainTabId = message.mainTabId;
    }

    // Mở quảng cáo trong tab mới
    chrome.tabs.create({ url: message.url }, function (tab) {
      adTabId = tab.id;
    });
  }

  // Khi được yêu cầu quay lại tab chính
  else if (message.action === "returnToMainTab") {
    if (adTabId) {
      // Đóng tab quảng cáo
      chrome.tabs.remove(adTabId);
      adTabId = null;
    }

    // Chuyển về tab chính
    if (mainTabId || message.mainTabId) {
      const tabId = mainTabId || message.mainTabId;
      chrome.tabs.update(tabId, { active: true }, function () {
        // Thông báo cho content script để tiếp tục cuộn
        chrome.tabs.sendMessage(
          tabId,
          { action: "continueScrolling" },
          function (response) {
            if (chrome.runtime.lastError) {
              console.log(
                "Lỗi khi gửi tin nhắn:",
                chrome.runtime.lastError.message
              );
            }
            sendResponse({ status: "done" });
          }
        );
      });
    }
  }

  return true; // Cho phép sendResponse bất đồng bộ
});

// Lắng nghe khi tab được kích hoạt hoặc cập nhật
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // Kiểm tra xem tab có phải là X.com và đã tải xong chưa
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    (tab.url.includes("x.com") || tab.url.includes("twitter.com"))
  ) {
    // Kiểm tra xem URL có phải là trang đăng nhập không
    if (tab.url.includes("login") || tab.url.includes("i/flow/login")) {
      // Thực hiện inject script để kiểm tra và đăng nhập nếu cần
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      });
    }
  }
});
