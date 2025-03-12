// Lưu trữ ID của các tab
let mainTabId = null;
let adTabId = null;

console.log("Background script đã được tải");

// Lắng nghe các sự kiện từ popup và content scripts
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("Nhận tin nhắn:", message.action);

  // Khi được yêu cầu mở X.com
  if (message.action === "openXcom") {
    console.log("Xử lý yêu cầu mở X.com");
    // Kiểm tra xem đã có tab X.com nào đang mở không
    chrome.tabs.query(
      { url: ["*://x.com/*", "*://twitter.com/*"] },
      function (tabs) {
        if (tabs.length > 0) {
          // Nếu đã có tab X.com, chỉ cần chuyển đến tab đó
          console.log("Đã tìm thấy tab X.com, chuyển đến tab:", tabs[0].id);
          chrome.tabs.update(tabs[0].id, { active: true });
          mainTabId = tabs[0].id;
        } else {
          // Nếu chưa có, mở tab mới đến X.com
          console.log("Không tìm thấy tab X.com, mở tab mới");
          chrome.tabs.create({ url: "https://x.com/" }, function (tab) {
            console.log("Đã mở tab mới với ID:", tab.id);
            mainTabId = tab.id;
          });
        }
      }
    );
  }

  // Khi content script yêu cầu ID của tab hiện tại
  else if (message.action === "getTabId") {
    console.log("Xử lý yêu cầu lấy tab ID từ tab:", sender.tab.id);
    sendResponse({ tabId: sender.tab.id });
    mainTabId = sender.tab.id;
  }

  // Khi được yêu cầu mở quảng cáo
  else if (message.action === "openAd") {
    console.log("Xử lý yêu cầu mở quảng cáo:", message.url);

    // Lưu lại ID của tab chính
    if (message.mainTabId) {
      console.log("Lưu main tab ID:", message.mainTabId);
      mainTabId = message.mainTabId;
    }

    // Mở quảng cáo trong tab mới
    chrome.tabs.create({ url: message.url }, function (tab) {
      console.log("Đã mở tab quảng cáo với ID:", tab.id);
      adTabId = tab.id;
    });
  }

  // Khi được yêu cầu quay lại tab chính
  else if (message.action === "returnToMainTab") {
    console.log("Xử lý yêu cầu quay lại tab chính");

    if (adTabId) {
      // Đóng tab quảng cáo
      console.log("Đóng tab quảng cáo:", adTabId);
      chrome.tabs.remove(adTabId, function () {
        console.log("Đã đóng tab quảng cáo");
      });
      adTabId = null;
    }

    // Chuyển về tab chính
    const tabId = mainTabId || message.mainTabId;
    if (tabId) {
      console.log("Chuyển về tab chính:", tabId);
      chrome.tabs.update(tabId, { active: true }, function () {
        // Kiểm tra xem tab có tồn tại không
        chrome.tabs.get(tabId, function (tab) {
          if (chrome.runtime.lastError) {
            console.log(
              "Lỗi khi chuyển tab:",
              chrome.runtime.lastError.message
            );
            sendResponse({
              status: "error",
              message: chrome.runtime.lastError.message,
            });
            return;
          }

          // Thông báo cho content script để tiếp tục cuộn
          console.log("Gửi thông báo continueScrolling đến tab:", tabId);
          chrome.tabs.sendMessage(
            tabId,
            { action: "continueScrolling" },
            function (response) {
              if (chrome.runtime.lastError) {
                console.log(
                  "Lỗi khi gửi tin nhắn:",
                  chrome.runtime.lastError.message
                );
                sendResponse({
                  status: "error",
                  message: chrome.runtime.lastError.message,
                });
              } else {
                console.log("Đã gửi thông báo continueScrolling thành công");
                sendResponse({ status: "done" });
              }
            }
          );
        });
      });
    } else {
      console.log("Không tìm thấy tab chính để quay lại");
      sendResponse({ status: "error", message: "No main tab ID" });
    }
  }

  // Thêm khả năng test kết nối
  else if (message.action === "testConnection") {
    console.log("Nhận yêu cầu kiểm tra kết nối");
    sendResponse({ status: "connected" });
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
    console.log("Tab X.com đã tải xong:", tabId, tab.url);

    // Thực hiện inject script để đảm bảo content script hoạt động
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ["content.js"],
      },
      function () {
        if (chrome.runtime.lastError) {
          console.log(
            "Lỗi khi inject script:",
            chrome.runtime.lastError.message
          );
        } else {
          console.log("Đã inject content script vào tab:", tabId);
        }
      }
    );
  }
});

// Thêm event listener cho message từ content script để debug
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Nhận message:", request);
  return true;
});
