// Biến toàn cục để theo dõi trạng thái
let isScrolling = false;
let adTabId = null;
let mainTabId = null;
let lastScrollPosition = 0;

// Hàm tự động đăng nhập
function autoLogin(username, password) {
  // Chờ một chút để đảm bảo trang đã tải hoàn toàn
  setTimeout(() => {
    console.log("Đang thử đăng nhập...");

    // Kiểm tra xem có ở trang đăng nhập không
    const isLoginPage =
      document.querySelector('input[name="text"]') ||
      document.querySelector('input[autocomplete="username"]');

    if (isLoginPage) {
      // Tìm các trường nhập liệu
      const usernameField =
        document.querySelector('input[name="text"]') ||
        document.querySelector('input[autocomplete="username"]');

      if (usernameField) {
        // Điền tên đăng nhập
        usernameField.value = username;
        usernameField.dispatchEvent(new Event("input", { bubbles: true }));

        // Tìm và nhấn nút "Tiếp theo" hoặc "Next"
        const nextButton = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (el) =>
            el.textContent.includes("Next") ||
            el.textContent.includes("Tiếp theo")
        );

        if (nextButton) {
          nextButton.click();

          // Chờ trường password xuất hiện
          setTimeout(() => {
            const passwordField =
              document.querySelector('input[name="password"]') ||
              document.querySelector('input[type="password"]');

            if (passwordField) {
              // Điền mật khẩu
              passwordField.value = password;
              passwordField.dispatchEvent(
                new Event("input", { bubbles: true })
              );

              // Tìm và nhấn nút "Đăng nhập" hoặc "Log in"
              const loginButton = Array.from(
                document.querySelectorAll('div[role="button"]')
              ).find(
                (el) =>
                  el.textContent.includes("Log in") ||
                  el.textContent.includes("Đăng nhập")
              );

              if (loginButton) {
                loginButton.click();

                // Sau khi đăng nhập, chờ một chút rồi bắt đầu tự động cuộn
                setTimeout(() => {
                  if (checkLoginStatus()) {
                    startAutoScroll();
                  }
                }, 5000); // Đợi 5 giây sau khi đăng nhập để trang tải hoàn tất
              }
            }
          }, 1500); // Đợi 1.5 giây để trang chuyển đến bước nhập mật khẩu
        }
      }
    }
  }, 1000); // Đợi 1 giây sau khi trang tải để các thành phần DOM hoàn tất việc render
}

// Kiểm tra trạng thái đăng nhập hiện tại
function checkLoginStatus() {
  // Nếu thấy các phần tử chỉ xuất hiện khi đã đăng nhập
  const isLoggedIn =
    document.querySelector('a[href="/home"]') ||
    document.querySelector('a[aria-label="Profile"]') ||
    document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');

  return isLoggedIn !== null;
}

// Hàm bắt đầu tự động cuộn
function startAutoScroll() {
  if (isScrolling) return; // Nếu đang cuộn rồi thì không làm gì

  console.log("Bắt đầu tự động cuộn...");
  isScrolling = true;

  // Lưu lại ID của tab hiện tại
  chrome.runtime.sendMessage({ action: "getTabId" }, (response) => {
    mainTabId = response.tabId;
  });

  // Thiết lập interval để cuộn trang
  const scrollInterval = setInterval(() => {
    if (!isScrolling) {
      clearInterval(scrollInterval);
      return;
    }

    // Lưu vị trí cuộn hiện tại
    lastScrollPosition = window.scrollY;

    // Cuộn xuống một chút
    window.scrollBy(0, 300);

    // Kiểm tra xem có quảng cáo không
    checkForAds();
  }, 2000); // Cuộn sau mỗi 2 giây
}

// Dừng tự động cuộn
function stopAutoScroll() {
  console.log("Dừng tự động cuộn...");
  isScrolling = false;
}

// Kiểm tra quảng cáo
function checkForAds() {
  // Các selector có thể là quảng cáo trên X.com
  const adSelectors = [
    'div[data-testid="placementTracking"]',
    'div[data-testid="tweet"] span:contains("Promoted")',
    'div[data-testid="tweet"] span:contains("Quảng cáo")',
    'article[data-testid="tweet"]:has(span:contains("Promoted"))',
    'article[data-testid="tweet"]:has(span:contains("Quảng cáo"))',
  ];

  // Hàm tìm kiếm text trong các phần tử
  jQuery.expr[":"].contains = function (a, i, m) {
    return jQuery(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
  };

  // Tìm quảng cáo
  let adFound = false;

  for (const selector of adSelectors) {
    try {
      const ads = document.querySelectorAll(selector);
      if (ads && ads.length > 0) {
        for (const ad of ads) {
          // Tìm link trong quảng cáo
          const links = ad.querySelectorAll('a[role="link"]');
          if (links && links.length > 0) {
            // Lấy link đầu tiên
            const adLink = links[0].href;
            if (adLink && !adFound) {
              adFound = true;
              handleAd(adLink);
              break;
            }
          }
        }
      }
    } catch (e) {
      // Bỏ qua lỗi selector không hợp lệ
      console.log("Lỗi khi tìm quảng cáo:", e);
    }
  }
}

// Xử lý quảng cáo
function handleAd(adLink) {
  console.log("Đã tìm thấy quảng cáo:", adLink);
  stopAutoScroll();

  // Gửi yêu cầu mở quảng cáo trong tab mới
  chrome.runtime.sendMessage({
    action: "openAd",
    url: adLink,
    mainTabId: mainTabId,
  });

  // Sau 5 giây, quay lại tab chính và tiếp tục cuộn
  setTimeout(() => {
    chrome.runtime.sendMessage(
      {
        action: "returnToMainTab",
        mainTabId: mainTabId,
      },
      () => {
        // Khi đã quay lại tab chính, tiếp tục cuộn
        startAutoScroll();
      }
    );
  }, 5000); // Đợi 5 giây
}

// Nhận tin nhắn từ background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "continueScrolling") {
    // Tiếp tục cuộn từ vị trí đã lưu
    window.scrollTo(0, lastScrollPosition);
    startAutoScroll();
    sendResponse({ status: "ok" });
  }
  return true;
});

// Chạy script chính
(function () {
  // Thêm jQuery từ file offline
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("jquery.min.js"); // Giả định file jquery.min.js đã được đặt trong thư mục gốc của extension
  document.head.appendChild(script);

  // Đảm bảo jQuery đã được tải xong trước khi sử dụng
  script.onload = function () {
    // Kiểm tra trạng thái đăng nhập
    if (!checkLoginStatus()) {
      // Nếu chưa đăng nhập, lấy thông tin từ storage để thực hiện đăng nhập
      chrome.storage.sync.get(["username", "password"], function (data) {
        if (data.username && data.password) {
          autoLogin(data.username, data.password);
        }
      });
    } else {
      // Nếu đã đăng nhập rồi, bắt đầu cuộn
      setTimeout(startAutoScroll, 2000);
    }
  };
})();
