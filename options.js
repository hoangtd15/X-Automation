document.addEventListener("DOMContentLoaded", function () {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const saveButton = document.getElementById("save");
  const statusElement = document.getElementById("status");

  // Tải thông tin hiện tại (nếu có)
  chrome.storage.sync.get(["username", "password"], function (data) {
    if (data.username) {
      usernameInput.value = data.username;
    }
    if (data.password) {
      passwordInput.value = data.password;
    }
  });

  // Lưu thông tin khi người dùng nhấn nút lưu
  saveButton.addEventListener("click", function () {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showStatus("Vui lòng nhập đầy đủ thông tin đăng nhập", "warning");
      return;
    }

    // Lưu thông tin vào storage
    chrome.storage.sync.set(
      {
        username: username,
        password: password,
      },
      function () {
        showStatus("Đã lưu thông tin đăng nhập thành công!", "success");
      }
    );
  });

  function showStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = "status " + type;
    statusElement.style.display = "block";

    // Ẩn thông báo sau 3 giây
    setTimeout(function () {
      statusElement.style.display = "none";
    }, 3000);
  }
});
