// Biến toàn cục để theo dõi trạng thái
let isScrolling = false;
let adTabId = null;
let mainTabId = null;
let lastScrollPosition = 0;
let scrollInterval = null;
let lastReloadTime = Date.now();
const RELOAD_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Biến cho cài đặt tốc độ cuộn
let scrollSpeed = 1;
let scrollIntervalTime = 3000; // Thời gian giữa các lần cuộn (ms)
let scrollDistance = 300; // Khoảng cách cuộn (px)

// Khi trang tải xong
window.addEventListener("load", function () {
  console.log("X.com Auto Scroll: Trang đã tải xong");
  lastReloadTime = Date.now();

  // Tải cài đặt tốc độ cuộn
  chrome.storage.sync.get(["scrollSpeed"], function (data) {
    if (data.scrollSpeed) {
      scrollSpeed = parseInt(data.scrollSpeed);
      updateScrollSettings();
    }

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
});

// Hàm cập nhật cài đặt cuộn
function updateScrollSettings() {
  switch (scrollSpeed) {
    case 1:
      scrollIntervalTime = 3000;
      break;
    case 2:
      scrollIntervalTime = 1500;
      break;
    case 3:
      scrollIntervalTime = 750;
      break;
    default:
      scrollIntervalTime = 3000;
  }

  console.log(
    `Đã cập nhật tốc độ cuộn: cấp độ ${scrollSpeed}, thời gian: ${scrollIntervalTime}ms`
  );

  if (isScrolling && scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = setInterval(performScroll, scrollIntervalTime);
  }
}

function isLoggedIn() {
  return (
    document.querySelector('a[href="/home"]') !== null ||
    document.querySelector('a[aria-label="Profile"]') !== null ||
    document.querySelector('a[data-testid="AppTabBar_Profile_Link"]') !== null
  );
}

function saveTabId() {
  chrome.runtime.sendMessage({ action: "getTabId" }, function (response) {
    if (response && response.tabId) {
      mainTabId = response.tabId;
      console.log("Đã lưu mainTabId:", mainTabId);
    }
  });
}

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

function loginToXcom(username, password) {
  console.log("Bắt đầu quá trình đăng nhập...");

  setTimeout(function () {
    const usernameField =
      document.querySelector('input[name="text"]') ||
      document.querySelector('input[autocomplete="username"]');

    if (usernameField) {
      usernameField.value = username;
      usernameField.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("Đã điền username");

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

          setTimeout(function () {
            const passwordField =
              document.querySelector('input[name="password"]') ||
              document.querySelector('input[type="password"]');

            if (passwordField) {
              passwordField.value = password;
              passwordField.dispatchEvent(
                new Event("input", { bubbles: true })
              );
              console.log("Đã điền password");

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

function performScroll() {
  if (!isScrolling) return;

  // Check if it's time to reload
  if (Date.now() - lastReloadTime >= RELOAD_INTERVAL) {
    console.log("5 minutes passed, reloading page...");
    lastReloadTime = Date.now();
    location.reload();
    return;
  }

  lastScrollPosition = window.scrollY;
  window.scrollBy(0, scrollDistance);
  console.log("Đã cuộn xuống đến vị trí:", window.scrollY);

  setTimeout(checkForAds, 1000);
}

function startScrolling() {
  if (isScrolling) {
    console.log("Đã đang cuộn, không khởi động lại");
    return;
  }

  console.log(`Bắt đầu tự động cuộn với tốc độ cấp độ ${scrollSpeed}`);
  isScrolling = true;
  scrollInterval = setInterval(performScroll, scrollIntervalTime);
}

function stopScrolling() {
  console.log("Dừng tự động cuộn");
  isScrolling = false;

  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
}

function checkForAds() {
  console.log("Đang kiểm tra quảng cáo...");

  const tweets = document.querySelectorAll(
    'article[data-testid="tweet"], div[data-testid="promoted-tweet"]'
  );

  if (!tweets || tweets.length === 0) {
    console.log("Không tìm thấy tweet nào");
    return;
  }

  console.log(`Tìm thấy ${tweets.length} tweets, đang kiểm tra quảng cáo...`);

  for (const tweet of tweets) {
    const tweetText = tweet.textContent || "";

    if (tweetText.includes("Promoted") || tweetText.includes("Quảng cáo")) {
      console.log("Đã tìm thấy quảng cáo!");

      const links = tweet.querySelectorAll(
        'a[href*="/"]:not([href*="/home"]):not([href*="/notifications"])'
      );

      for (const link of links) {
        const adLink = link.href;
        if (
          adLink &&
          !adLink.includes("twitter.com/home") &&
          !adLink.includes("twitter.com/notifications")
        ) {
          console.log("Tìm thấy link quảng cáo:", adLink);
          handleAd(adLink);
          return;
        }
      }
    }
  }

  console.log("Không tìm thấy quảng cáo trong lần kiểm tra này");
}

function handleAd(adLink) {
  stopScrolling();
  console.log("Dừng cuộn và mở quảng cáo:", adLink);

  const formattedLink = adLink.startsWith("http")
    ? adLink
    : `https://twitter.com${adLink}`;

  chrome.runtime.sendMessage({
    action: "openAd",
    url: formattedLink,
    mainTabId: mainTabId,
  });

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
  } else if (message.action === "setScrollSpeed") {
    scrollSpeed = message.speed;
    updateScrollSettings();
    sendResponse({ status: "ok", newSpeed: scrollSpeed });
  } else if (message.action === "testConnection") {
    sendResponse({ status: "connected" });
  }

  return true;
});

console.log("X.com Auto Scroll: Content script đã được tải");
