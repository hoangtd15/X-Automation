// Biến toàn cục để theo dõi trạng thái
let isScrolling = false;
let adTabId = null;
let mainTabId = null;
let lastScrollPosition = 0;
let scrollInterval = null;

// Khi trang tải xong
window.addEventListener("load", function () {
  console.log("X.com Auto Scroll: Trang đã tải xong");

  // Kiểm tra trạng thái đăng nhập
  setTimeout(function () {
    if (isLoggedIn()) {
      console.log("Đã đăng nhập vào X.com");
      // Lưu ID tab
      saveTabId();
      // Bắt đầu tự động cuộn sau 3 giây
      setTimeout(startScrolling, 3000);
    } else {
      console.log("Chưa đăng nhập vào X.com");
      tryLogin();
    }
  }, 2000);
});

// Kiểm tra xem người dùng đã đăng nhập chưa
function isLoggedIn() {
  // Kiểm tra các phần tử chỉ xuất hiện khi đã đăng nhập
  return (
    document.querySelector('a[href="/home"]') !== null ||
    document.querySelector('a[aria-label="Profile"]') !== null ||
    document.querySelector('a[data-testid="AppTabBar_Profile_Link"]') !== null
  );
}

// Lưu ID tab hiện tại
function saveTabId() {
  chrome.runtime.sendMessage({ action: "getTabId" }, function (response) {
    if (response && response.tabId) {
      mainTabId = response.tabId;
      console.log("Đã lưu mainTabId:", mainTabId);
    }
  });
}

// Thử đăng nhập
function tryLogin() {
  console.log("Đang thử đăng nhập...");
  chrome.storage.sync.get(["username", "password"], function (data) {
    if (data.username && data.password) {
      console.log(
        "Tìm thấy thông tin đăng nhập, đang thử đăng nhập với:",
        data.username
      );
      loginToXcom(data.username, data.password);
    } else {
      console.log("Không tìm thấy thông tin đăng nhập");
    }
  });
}

// Hàm đăng nhập
function loginToXcom(username, password) {
  console.log("Bắt đầu quá trình đăng nhập...");

  // Tìm trường username/email
  setTimeout(function () {
    const usernameField =
      document.querySelector('input[name="text"]') ||
      document.querySelector('input[autocomplete="username"]');

    if (usernameField) {
      // Điền username
      usernameField.value = username;
      usernameField.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("Đã điền username");

      // Tìm và nhấn nút Next
      setTimeout(function () {
        const nextButton = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (el) =>
            el.textContent.includes("Next") ||
            el.textContent.includes("Tiếp theo")
        );

        if (nextButton) {
          nextButton.click();
          console.log("Đã nhấn nút Next");

          // Tìm trường password
          setTimeout(function () {
            const passwordField =
              document.querySelector('input[name="password"]') ||
              document.querySelector('input[type="password"]');

            if (passwordField) {
              // Điền password
              passwordField.value = password;
              passwordField.dispatchEvent(
                new Event("input", { bubbles: true })
              );
              console.log("Đã điền password");

              // Tìm và nhấn nút đăng nhập
              setTimeout(function () {
                const loginButton = Array.from(
                  document.querySelectorAll('div[role="button"]')
                ).find(
                  (el) =>
                    el.textContent.includes("Log in") ||
                    el.textContent.includes("Đăng nhập")
                );

                if (loginButton) {
                  loginButton.click();
                  console.log("Đã nhấn nút đăng nhập");

                  // Đợi đăng nhập thành công và bắt đầu cuộn
                  setTimeout(function () {
                    if (isLoggedIn()) {
                      console.log("Đăng nhập thành công");
                      saveTabId();
                      startScrolling();
                    } else {
                      console.log("Đăng nhập thất bại");
                    }
                  }, 5000);
                } else {
                  console.log("Không tìm thấy nút đăng nhập");
                }
              }, 1000);
            } else {
              console.log("Không tìm thấy trường password");
            }
          }, 2000);
        } else {
          console.log("Không tìm thấy nút Next");
        }
      }, 1000);
    } else {
      console.log("Không tìm thấy trường username");
    }
  }, 2000);
}

// Bắt đầu tự động cuộn
function startScrolling() {
  if (isScrolling) {
    console.log("Đã đang cuộn, không khởi động lại");
    return;
  }

  console.log("Bắt đầu tự động cuộn");
  isScrolling = true;

  // Hàm cuộn đơn giản
  function performScroll() {
    if (!isScrolling) return;

    // Lưu vị trí cuộn hiện tại
    lastScrollPosition = window.scrollY;

    // Cuộn xuống
    window.scrollBy(0, 300);
    console.log("Đã cuộn xuống đến vị trí:", window.scrollY);

    // Kiểm tra quảng cáo sau khi cuộn
    setTimeout(checkForAds, 1000);
  }

  // Thiết lập interval để cuộn định kỳ
  scrollInterval = setInterval(performScroll, 3000);
}

// Dừng tự động cuộn
function stopScrolling() {
  console.log("Dừng tự động cuộn");
  isScrolling = false;

  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
}

// Kiểm tra quảng cáo
function checkForAds() {
  console.log("Đang kiểm tra quảng cáo...");

  // Tìm tất cả các tweet
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');

  if (!tweets || tweets.length === 0) {
    console.log("Không tìm thấy tweet nào");
    return;
  }

  console.log(`Tìm thấy ${tweets.length} tweets, đang kiểm tra quảng cáo...`);

  // Kiểm tra từng tweet xem có phải là quảng cáo không
  for (const tweet of tweets) {
    const tweetText = tweet.textContent || "";

    // Kiểm tra xem tweet có chứa "Promoted" hoặc "Quảng cáo" không
    if (tweetText.includes("Promoted") || tweetText.includes("Quảng cáo")) {
      console.log("Đã tìm thấy quảng cáo!");

      // Tìm link trong quảng cáo
      const links = tweet.querySelectorAll('a[role="link"]');

      if (links && links.length > 0) {
        const adLink = links[0].href;

        if (adLink) {
          console.log("Tìm thấy link quảng cáo:", adLink);

          // Xử lý quảng cáo
          handleAd(adLink);
          return; // Chỉ xử lý một quảng cáo tại một thời điểm
        }
      }
    }
  }

  console.log("Không tìm thấy quảng cáo trong lần kiểm tra này");
}

// Xử lý quảng cáo
function handleAd(adLink) {
  stopScrolling();
  console.log("Dừng cuộn và mở quảng cáo:", adLink);

  // Gửi yêu cầu mở quảng cáo trong tab mới
  chrome.runtime.sendMessage({
    action: "openAd",
    url: adLink,
    mainTabId: mainTabId,
  });

  // Sau 5 giây, quay lại tab chính và tiếp tục cuộn
  setTimeout(function () {
    console.log("Đã đợi 5 giây, quay lại tab chính");

    chrome.runtime.sendMessage(
      {
        action: "returnToMainTab",
        mainTabId: mainTabId,
      },
      function () {
        setTimeout(startScrolling, 1000);
      }
    );
  }, 5000);
}

// Lắng nghe tin nhắn từ background và popup
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("Nhận tin nhắn:", message.action);

  if (message.action === "continueScrolling") {
    console.log("Tiếp tục cuộn từ vị trí:", lastScrollPosition);
    window.scrollTo(0, lastScrollPosition);
    startScrolling();
    sendResponse({ status: "ok" });
  } else if (message.action === "startScrolling") {
    startScrolling();
    sendResponse({ status: "ok" });
  } else if (message.action === "stopScrolling") {
    stopScrolling();
    sendResponse({ status: "ok" });
  }

  return true;
});

// Thêm các log để debug
console.log("X.com Auto Scroll: Content script đã được tải");
