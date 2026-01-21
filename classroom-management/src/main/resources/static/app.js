const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const store = {
  apiBase: localStorage.getItem("apiBase") || "http://localhost:8080",
  authPrefix: localStorage.getItem("authPrefix") || "",
  token: localStorage.getItem("token") || "",
  role: localStorage.getItem("role") || "",
  username: localStorage.getItem("username") || "",
};

const state = {
  classrooms: [],
  courses: [],
  schedules: [],
  users: [],
};

function toast(msg, type = "ok") {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden", "ok", "err");
  el.classList.add(type === "err" ? "err" : "ok");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 2400);
}

function saveSettings() {
  localStorage.setItem("apiBase", store.apiBase);
  localStorage.setItem("authPrefix", store.authPrefix);
}
function saveAuth() {
  localStorage.setItem("token", store.token);
  localStorage.setItem("role", store.role);
  localStorage.setItem("username", store.username);
}
function clearAuth() {
  store.token = "";
  store.role = "";
  store.username = "";
  saveAuth();
}

function authHeader() {
  if (!store.token) return {};
  const raw = (store.authPrefix ?? "").trim();
  if (!raw) return { Authorization: `Bearer ${store.token}` };
  const prefix = raw.endsWith(" ") ? raw : (raw.includes(" ") ? raw + " " : raw + " ");
  return { Authorization: `${prefix}${store.token}` };
}

async function apiFetch(path, { method = "GET", query, body } = {}) {
  const url = new URL(store.apiBase + path);
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let payload;
  if (ct.includes("application/json")) {
    payload = await res.json().catch(() => null);
  } else {
    payload = await res.text().catch(() => "");
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      const msg = "登录已失效或无权限，请重新登录。";
      store.token = "";
      store.role = "";
      store.username = "";
      saveSettings();
      showView("auth");
      toast(msg, "err");
      alert(msg);
      throw new Error(msg);
    }

    const msg =
      (payload && typeof payload === "object" && (payload.msg || payload.message)) ||
      (typeof payload === "string" && payload.trim().slice(0, 200)) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }


  if (payload && typeof payload === "object") {
    if (payload.code != null && payload.code !== 200) throw new Error(payload.msg || "请求失败");
    if (payload.success === false) throw new Error(payload.message || "请求失败");
    return ("data" in payload) ? payload.data : payload;
  }
  return payload;
}

/* ========= 多界面 JS 切换 ========= */

function showViewAuth() {
  $("#viewAuth").classList.remove("hidden");
  $("#viewApp").classList.add("hidden");
}

function showViewApp() {
  $("#viewAuth").classList.add("hidden");
  $("#viewApp").classList.remove("hidden");
}

function switchPage(pageId) {
  $$(".page").forEach(p => p.classList.add("hidden"));
  $(`#${pageId}`).classList.remove("hidden");

  $$(".tab").forEach(t => t.classList.remove("active"));
  $(`.tab[data-page="${pageId}"]`)?.classList.add("active");

  // If on course page, default teacher field to current username (common backend expectation)
  if (pageId === "pageCourse") {
    const t = $("#coTeacher");
    if (t && !t.value.trim()) t.value = store.username || "";
  }
  
  // 如果切换到"我的预约"页面，自动加载我的预约数据
  if (pageId === "pageMy") {
    loadMySchedules().catch(() => { });
  }
  
  // 如果切换到"课室"页面，自动更新课室状态
  if (pageId === "pageClassrooms") {
    // 执行与刷新按钮相同的操作
    bootstrapData().then(() => {
      return updateClassroomStatus();
    }).then(() => {
      // 确保渲染最新的课室状态
      renderClassrooms();
    }).catch(err => {
      console.error("刷新课室数据失败:", err);
    });
  } else {
    // 如果离开课室页面，清除定时器（如果存在）
    if (window.classroomStatusInterval) {
      clearInterval(window.classroomStatusInterval);
      window.classroomStatusInterval = null;
    }
  }
}

function setWhoAmI() {
  $("#whoami").textContent = `用户：${store.username || "-"}  ·  角色：${store.role || "-"}`;
}

/* ========= 字段兼容小工具 ========= */

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function pick(obj, keys, fallback = "") {
  for (const k of keys) if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  return fallback;
}
function optionText(item, type) {
  if (type === "classroom") {
    const id = pick(item, ["id", "classroomId", "classroom_id", "roomId", "room_id"], "");
    const name = pick(item, ["roomName", "room_name", "classroomName", "classroom_name", "name", "title"], id ? `教室${id}` : "未命名教室");
    const loc = pick(item, ["location", "addr", "place"], "");
    const cap = pick(item, ["capacity", "cap"], "");
    return `${name}${loc ? " · " + loc : ""}${cap ? " · " + cap + "人" : ""}`;
  }
  if (type === "course") {
    const name = pick(item, ["name", "courseName", "title"], "未命名课程");
    const code = pick(item, ["code", "courseCode"], "");
    const teacher = pick(item, ["teacher", "instructor"], "");
    return `${name}${code ? " · " + code : ""}${teacher ? " · " + teacher : ""}`;
  }
  return pick(item, ["name", "title"], "item");
}

function formatDate(s) {
  // 优先展示接口返回的具体日期字段
  const d = pick(s, ["date", "day", "scheduleDate", "classDate"], "");
  if (d) return d; // 直接返回日期，不再转换为星期
  // 如果后端只返回 week_day / weekDay（课表常见：周一=1 ... 周日=7），则显示为"周X"
  const wdRaw = pick(s, ["weekDay", "week_day", "weekday", "dayOfWeek"], "");
  const wd = Number(wdRaw);
  if (!wdRaw || Number.isNaN(wd)) return "--";
  const map = { 1: "周一", 2: "周二", 3: "周三", 4: "周四", 5: "周五", 6: "周六", 7: "周日", 0: "周日" };
  return map[wd] || `周${wd}`;
}
function formatTimeRange(s) {
  const a = pick(s, ["startTime", "start_time", "start", "beginTime", "begin"], "");
  const b = pick(s, ["endTime", "end_time", "end", "finishTime", "finish"], "");
  if (a || b) return `${a || "--"} ~ ${b || "--"}`;
  return pick(s, ["timeSlot", "slot"], "--");
}
function formatClassroomText(s) { return pick(s, ["classroomName", "roomName", "classroom", "classroomId", "roomId"], "--"); }
function formatCourseText(s) { return pick(s, ["courseName", "course_name", "name", "course", "courseId", "course_code", "courseCode", "id"], "--"); }

function calcWeekDay(dateStr) {
  // 返回 1~7：周一=1 ... 周日=7（与后端 schedule.week_day 常见约定一致）
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const js = d.getDay(); // 0=周日 ... 6=周六
  return js === 0 ? 7 : js;
}


/* ========= 数据加载 ========= */

async function loadClassrooms() {
  const data = await apiFetch("/api/classroom/all");
  state.classrooms = Array.isArray(data) ? data : [];
  renderClassrooms();
  renderClassroomSelect();
  renderStats();
}
async function loadCourses() {
  const data = await apiFetch("/api/course/all");
  state.courses = Array.isArray(data) ? data : [];
  renderCourses();
  renderCourseSelect();
  renderStats();
}
async function loadSchedulesAll() {
  const data = await apiFetch("/api/schedule/list");
  state.schedules = Array.isArray(data) ? data : [];
  renderSchedules(state.schedules);
  renderStats();
}
async function loadSchedulesByClassroom(id) {
  const data = await apiFetch(`/api/schedule/byClassroom/${encodeURIComponent(id)}`);
  state.schedules = Array.isArray(data) ? data : [];
  renderSchedules(state.schedules);
}
async function loadSchedulesByCourse(id) {
  const data = await apiFetch(`/api/schedule/byCourse/${encodeURIComponent(id)}`);
  state.schedules = Array.isArray(data) ? data : [];
  renderSchedules(state.schedules);
}
async function loadSchedulesByTeacher(teacher) {
  const data = await apiFetch(`/api/schedule/byTeacher`, { query: { teacher } });
  state.schedules = Array.isArray(data) ? data : [];
  renderSchedules(state.schedules);
}
async function loadMySchedules() {
  const data = await apiFetch(`/api/schedule/byTeacher`, { query: { teacher: store.username } });
  renderMySchedules(Array.isArray(data) ? data : []);
}

// 更新课室状态，根据当前时间和预约信息
async function updateClassroomStatus() {
  // 调用后端的更新状态方法
  await apiFetch("/api/schedule/updateClassroomStatus", { method: "POST" });
  // 重新加载课室数据以获取更新后的状态
  await loadClassrooms();
}

async function loadUsers() {
  const data = await apiFetch(`/api/user/all`);
  state.users = Array.isArray(data) ? data : [];
  renderUsers();
}

/* ========= 渲染 ========= */

function renderStats() {
  $("#statClassrooms").textContent = state.classrooms.length || 0;
  $("#statCourses").textContent = state.courses.length || 0;
  $("#statSchedules").textContent = state.schedules.length || 0;
}

function renderClassroomSelect() {
  $("#schClassroom").innerHTML = state.classrooms.map(c => {
    const id = pick(c, ["id", "classroomId", "classroom_id", "roomId", "room_id"]);
    return `<option value="${escapeHtml(id)}">${escapeHtml(optionText(c, "classroom"))}</option>`;
  }).join("");

  if ($("#filterType").value === "classroom") {
    $("#filterValueSelect").innerHTML = $("#schClassroom").innerHTML;
  }
}

function renderCourseSelect() {
  $("#schCourse").innerHTML = state.courses.map(c => {
    const id = pick(c, ["id", "courseId", "course_id", "code", "courseCode", "course_code"]);
    return `<option value="${escapeHtml(id)}">${escapeHtml(optionText(c, "course"))}</option>`;
  }).join("");

  if ($("#filterType").value === "course") {
    $("#filterValueSelect").innerHTML = $("#schCourse").innerHTML;
  }
}

function renderClassrooms() {
  const tb = $("#classroomTbody");
  tb.innerHTML = state.classrooms.map(c => {
    const id = pick(c, ["id", "classroomId", "classroom_id", "roomId", "room_id"]);
    const name = pick(c, ["roomName", "room_name", "name", "classroomName", "classroom_name", "title"], "");
    const equipment = pick(c, ["equipment", "location", "addr", "place"], "");
    const capacity = pick(c, ["capacity", "cap"], "");
    const status = pick(c, ["status"], "");
    return `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(equipment)}</td>
        <td>${escapeHtml(capacity)}</td>
        <td><span class="pill">${escapeHtml(status)}</span></td>
        <td>
          <div class="row">
            <button class="btn" data-action="edit-classroom" data-id="${escapeHtml(id)}">编辑</button>
            <button class="btn danger" data-action="del-classroom" data-id="${escapeHtml(id)}">删除</button>
          </div>
        </td>
      </tr>`;
  }).join("") || `<tr><td colspan="5" class="muted">暂无课室</td></tr>`;
}

function renderCourses() {
  const tb = $("#courseTbody");
  tb.innerHTML = state.courses.map(c => {
    const id = pick(c, ["id", "courseId", "course_id", "code", "courseCode", "course_code"]);
    const name = pick(c, ["courseName", "course_name", "name", "title"], "");
    const code = pick(c, ["id", "code", "courseCode", "course_code"], "");
    const teacher = pick(c, ["teacher", "teacherName", "instructor"], "");
    return `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(code)}</td>
        <td>${escapeHtml(teacher)}</td>
        <td>
          <div class="row">
            <button class="btn" data-action="edit-course" data-id="${escapeHtml(id)}">编辑</button>
            <button class="btn danger" data-action="del-course" data-id="${escapeHtml(id)}">删除</button>
          </div>
        </td>
      </tr>`;
  }).join("") || `<tr><td colspan="4" class="muted">暂无课程</td></tr>`;
}

function renderSchedules(list) {
  const tb = $("#scheduleTbody");
  tb.innerHTML = (list || []).map(s => {
    const id = pick(s, ["id"]);
    return `
      <tr>
        <td>${escapeHtml(formatClassroomText(s))}</td>
        <td>${escapeHtml(formatCourseText(s))}</td>
        <td>${escapeHtml(pick(s, ["teacher", "teacherName"], "--"))}</td>
        <td>${escapeHtml(formatDate(s))}</td>
        <td>${escapeHtml(formatTimeRange(s))}</td>
        <td>
          <div class="row">
            <button class="btn" data-action="edit-schedule" data-id="${escapeHtml(id)}">编辑</button>
            <button class="btn danger" data-action="del-schedule" data-id="${escapeHtml(id)}">删除</button>
          </div>
        </td>
      </tr>`;
  }).join("") || `<tr><td colspan="6" class="muted">暂无预约</td></tr>`;
}

function renderMySchedules(list) {
  const tb = $("#myTbody");
  tb.innerHTML = (list || []).map(s => {
    const id = pick(s, ["id"]);
    return `
      <tr>
        <td>${escapeHtml(formatClassroomText(s))}</td>
        <td>${escapeHtml(formatCourseText(s))}</td>
        <td>${escapeHtml(formatDate(s))}</td>
        <td>${escapeHtml(formatTimeRange(s))}</td>
        <td>
          <div class="row">
            <button class="btn" data-action="edit-schedule" data-id="${escapeHtml(id)}">编辑</button>
            <button class="btn danger" data-action="del-schedule" data-id="${escapeHtml(id)}">删除</button>
          </div>
        </td>
      </tr>`;
  }).join("") || `<tr><td colspan="5" class="muted">暂无我的预约</td></tr>`;
}

function renderUsers() {
  const tb = $("#userTbody");
  tb.innerHTML = state.users.map(u => {
    const id = pick(u, ["id"]);
    const username = pick(u, ["username"], "");
    const role = pick(u, ["role"], "");
    return `
      <tr>
        <td>${escapeHtml(username)}</td>
        <td><span class="pill">${escapeHtml(role)}</span></td>
        <td>
          <div class="row">
            <button class="btn" data-action="edit-user" data-id="${escapeHtml(id)}">编辑</button>
            <button class="btn danger" data-action="del-user" data-id="${escapeHtml(id)}">删除</button>
          </div>
        </td>
      </tr>`;
  }).join("") || `<tr><td colspan="3" class="muted">暂无用户</td></tr>`;
}

/* ========= 事件 & 逻辑 ========= */

function initAuthTabs() {
  $("#tabLogin").addEventListener("click", () => {
    $("#tabLogin").classList.add("active");
    $("#tabRegister").classList.remove("active");
    $("#loginForm").classList.remove("hidden");
    $("#registerForm").classList.add("hidden");
  });
  $("#tabRegister").addEventListener("click", () => {
    $("#tabRegister").classList.add("active");
    $("#tabLogin").classList.remove("active");
    $("#registerForm").classList.remove("hidden");
    $("#loginForm").classList.add("hidden");
  });
}

function initLoginRegister() {
  const apiBaseEl = $("#apiBaseInput") || $("#apiBaseModal");
  const authPrefixEl = $("#authPrefixInput") || $("#authPrefixModal");

  if (apiBaseEl) apiBaseEl.value = store.apiBase;
  if (authPrefixEl) authPrefixEl.value = store.authPrefix;

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      store.apiBase = (apiBaseEl?.value ?? store.apiBase).trim() || "http://localhost:8080";
      store.authPrefix = (authPrefixEl?.value ?? store.authPrefix) || "";
      saveSettings();

      const username = $("#loginUsername").value.trim();
      const password = $("#loginPassword").value;

      const data = await apiFetch("/api/auth/login", { method: "POST", body: { username, password } });
      store.token = data.token || "";
      store.role = data.role || "";
      store.username = username;
      saveAuth();

      toast("登录成功");
      enterApp();
    } catch (err) {
      toast(err.message || "登录失败", "err");
      alert(err.message || "登录失败");
    }
  });

  $("#registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const username = $("#regUsername").value.trim();
      const password = $("#regPassword").value;
      const role = $("#regRole").value || null;
      const payload = { username, password };
      if (role) payload.role = role;

      await apiFetch("/api/auth/register", { method: "POST", body: payload });
      toast("注册成功，请登录");
      $("#tabLogin").click();
      $("#loginUsername").value = username;
      $("#loginPassword").value = password;
    } catch (err) {
      toast(err.message || "注册失败", "err");
      alert(err.message || "注册失败");
    }
  });
}


function initTabs() {
  $$(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page === "pageUsers" && store.role !== "ADMIN") {
        toast("只有管理员可进入用户管理", "err");
        return;
      }
      switchPage(page);
    });
  });
}

function initDashboardQuick() {
  $("#btnGoSchedule").addEventListener("click", () => switchPage("pageSchedule"));
  $("#btnGoMy").addEventListener("click", () => switchPage("pageMy"));
}

function initForms() {
  $("#classroomForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const id = $("#crId").value.trim();
      const roomName = $("#crName").value.trim();
      if (!roomName) { toast("课室名称不能为空", "err"); alert("课室名称不能为空"); return; }

      const location = ($("#crLocation")?.value || "").trim();
      const capacity = $("#crCapacity").value ? Number($("#crCapacity").value) : 0;
      const status = $("#crStatus")?.value || "FREE";
      const payload = {
        id: id || undefined,
        roomName,
        room_name: roomName,
        name: roomName,
        classroomName: roomName,
        classroom_name: roomName,
        capacity,
        equipment: location,
        status: status,
        location: location || null,
      };

      if (id) {
        await apiFetch("/api/classroom/update", { method: "PUT", body: payload });
        toast("课室更新成功");
      } else {
        await apiFetch("/api/classroom/save", { method: "POST", body: payload });
        toast("课室保存成功");
      }
      e.target.reset();
      resetClassroomForm();
      await loadClassrooms();
    } catch (err) {
      toast(err.message || "保存失败", "err");
    }
  });
  
  $("#courseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const id = $("#coId").value.trim();
      const courseName = $("#coName").value.trim();
      if (!courseName) { toast("课程名称不能为空", "err"); alert("课程名称不能为空"); return; }

      const code = ($("#coCode")?.value || "").trim();
      const teacherInput = ($("#coTeacher")?.value || "").trim();
      const teacher = teacherInput || store.username || null;
      const remark = ($("#coRemark")?.value || "").trim();

      const payload = {
        id: id || undefined,
        courseName,
        course_name: courseName,
        name: courseName,
        ...(code ? { id: code } : {}),
        code: code || null,
        courseCode: code || null,
        course_code: code || null,
        teacher,
        teacherName: teacher,
        instructor: teacher,
        remark: remark || null,
      };

      if (id) {
        await apiFetch("/api/course/update", { method: "PUT", body: payload });
        toast("课程更新成功");
      } else {
        await apiFetch("/api/course/save", { method: "POST", body: payload });
        toast("课程保存成功");
      }
      e.target.reset();
      resetCourseForm();
      await loadCourses();
    } catch (err) {
      toast(err.message || "保存失败", "err");
    }
  });
  
  $("#scheduleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const id = $("#schId").value.trim();
      const startTime = $("#schStart").value;
      const endTime = $("#schEnd").value;
      if (startTime && endTime && startTime >= endTime) {
        toast("结束时间必须晚于开始时间", "err");
        return;
      }

      const normalizeId = (v) => (/^\d+$/.test(String(v)) ? Number(v) : v);
      const classroomIdRaw = $("#schClassroom").value;
      const courseIdRaw = $("#schCourse").value;
      const classroomId = normalizeId(classroomIdRaw);
      const courseId = normalizeId(courseIdRaw);
      const teacher = ($("#schTeacher").value || "").trim() || store.username || "";
      const date = $("#schDate").value;
      const weekDay = calcWeekDay(date);
      if (!weekDay) {
        toast("日期不合法，无法计算星期", "err");
        return;
      }

      const remarkVal = ($("#schRemark").value || "").trim();

      // 兼容后端常见字段命名
      const payload = {
        id: id || undefined,
        classroomId, classroom_id: classroomId, classroom: classroomId,
        roomId: classroomId, room_id: classroomId,

        courseId, course_id: courseId, course: courseId,

        teacher, teacherName: teacher,

        date, scheduleDate: date, day: date, // 传递日期字段

        weekDay, week_day: weekDay, weekday: weekDay, dayOfWeek: weekDay,

        startTime, start_time: startTime, beginTime: startTime,
        endTime, end_time: endTime, finishTime: endTime,
        ...(remarkVal ? { remark: remarkVal } : {}),
      };

      if (id) {
        await apiFetch("/api/schedule/update", { method: "PUT", body: payload });
        toast("预约更新成功");
      } else {
        await apiFetch("/api/schedule/save", { method: "POST", body: payload });
        toast("预约提交成功");
      }
      e.target.reset();
      resetScheduleForm();
      await loadSchedulesAll();
      await loadMySchedules().catch(() => { });
    } catch (err) {
      toast(err.message || "预约失败", "err");
    }
  });

  $("#btnPreviewPayload").addEventListener("click", () => {
    const payload = {
      classroomId: $("#schClassroom").value,
      courseId: $("#schCourse").value,
      teacher: $("#schTeacher").value.trim(),
      date: $("#schDate").value,
      startTime: $("#schStart").value,
      endTime: $("#schEnd").value,
      remark: $("#schRemark").value.trim() || null,
    };
    const pre = $("#payloadPreview");
    pre.textContent = JSON.stringify(payload, null, 2);
    pre.classList.toggle("hidden");
  });

  $("#filterType").addEventListener("change", () => {
    const t = $("#filterType").value;
    $("#filterValueSelect").classList.add("hidden");
    $("#filterValueInput").classList.add("hidden");

    if (t === "classroom") {
      $("#filterValueSelect").classList.remove("hidden");
      $("#filterValueSelect").innerHTML = $("#schClassroom").innerHTML;
    } else if (t === "course") {
      $("#filterValueSelect").classList.remove("hidden");
      $("#filterValueSelect").innerHTML = $("#schCourse").innerHTML;
    } else if (t === "teacher") {
      $("#filterValueInput").classList.remove("hidden");
      $("#filterValueInput").value = store.username || "";
    }
  });

  $("#btnLoadSchedules").addEventListener("click", async () => {
    try {
      const t = $("#filterType").value;
      if (t === "all") await loadSchedulesAll();
      if (t === "classroom") await loadSchedulesByClassroom($("#filterValueSelect").value);
      if (t === "course") await loadSchedulesByCourse($("#filterValueSelect").value);
      if (t === "teacher") await loadSchedulesByTeacher($("#filterValueInput").value.trim());
    } catch (err) {
      toast(err.message || "查询失败", "err");
    }
  });

  $("#btnLoadMy").addEventListener("click", async () => {
    try { await loadMySchedules(); }
    catch (err) { toast(err.message || "加载失败", "err"); }
  });

  $("#btnLoadUsers").addEventListener("click", async () => {
    try { await loadUsers(); }
    catch (err) { toast(err.message || "加载失败", "err"); }
  });


  $("#userForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      if (store.role !== "ADMIN") return toast("只有管理员可操作", "err");

      const id = $("#uId").value.trim();
      const username = $("#uUsername").value.trim();
      const password = $("#uPassword").value;
      const role = $("#uRole").value;

      if (!id) {
        await apiFetch("/api/user/create", { method: "POST", body: { username, password, role } });
        toast("用户创建成功");
      } else {
        const payload = { id, username, role };
        if (password) payload.password = password;
        await apiFetch("/api/user/update", { method: "PUT", body: payload });
        toast("用户更新成功");
      }
      resetUserForm();
      await loadUsers();
    } catch (err) {
      toast(err.message || "保存失败", "err");
    }
  });

  $("#btnUserReset").addEventListener("click", resetUserForm);
  $("#btnResetClassroom").addEventListener("click", resetClassroomForm);
  $("#btnResetCourse").addEventListener("click", resetCourseForm);
  $("#btnResetSchedule").addEventListener("click", resetScheduleForm);
}

function resetUserForm() {
  $("#uId").value = "";
  $("#uUsername").value = "";
  $("#uPassword").value = "";
  $("#uRole").value = "TEACHER";
  $("#userFormTitle").textContent = "新增用户";
}

function resetClassroomForm() {
  $("#crId").value = "";
  $("#crName").value = "";
  $("#crLocation").value = "";
  $("#crCapacity").value = "";
  $("#crStatus").value = "FREE";
  $("#crRemark").value = "";
  $("#classroomFormTitle").textContent = "新增课室";
}

function resetCourseForm() {
  $("#coId").value = "";
  $("#coName").value = "";
  $("#coCode").value = "";
  $("#coTeacher").value = "";
  $("#coRemark").value = "";
  $("#courseFormTitle").textContent = "新增课程";
}

function resetScheduleForm() {
  $("#schId").value = "";
  $("#schClassroom").value = "";
  $("#schCourse").value = "";
  $("#schDate").value = "";
  $("#schStart").value = "";
  $("#schEnd").value = "";
  $("#schTeacher").value = store.username || "";
  $("#schRemark").value = "";
  $("#scheduleFormTitle").textContent = "创建预约";
}

function initTableActions() {
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    try {
      if (action === "del-classroom") {
        try {
          await apiFetch(`/api/classroom/delete/${encodeURIComponent(id)}`, { method: "DELETE" });
          toast("课室已删除");
          await loadClassrooms();
        } catch (err) {
          if (err.message.includes("foreign key") || err.message.includes("无法删除") || err.message.includes("相关预约")) {
            toast("存在相关预约，无法删除", "err");
          } else {
            toast(err.message || "课室删除失败", "err");
          }
        }
      }
      if (action === "del-course") {
        try {
          await apiFetch(`/api/course/delete/${encodeURIComponent(id)}`, { method: "DELETE" });
          toast("课程已删除");
          await loadCourses();
        } catch (err) {
          if (err.message.includes("foreign key") || err.message.includes("无法删除") || err.message.includes("相关预约")) {
            toast("存在相关预约，无法删除", "err");
          } else {
            toast(err.message || "课程删除失败", "err");
          }
        }
      }
      if (action === "del-schedule") {
        await apiFetch(`/api/schedule/delete/${encodeURIComponent(id)}`, { method: "DELETE" });
        toast("预约已删除");
        await loadSchedulesAll();
        await loadMySchedules().catch(() => { });
      }
      if (action === "del-user") {
        if (store.role !== "ADMIN") return toast("只有管理员可删除用户", "err");
        try {
          await apiFetch(`/api/user/delete/${encodeURIComponent(id)}`, { method: "DELETE" });
          toast("用户已删除");
          await loadUsers();
        } catch (err) {
          if (err.message.includes("foreign key") || err.message.includes("无法删除") || err.message.includes("相关课程")) {
            toast("存在相关课程或预约，无法删除", "err");
          } else {
            toast(err.message || "用户删除失败", "err");
          }
        }
      }
      if (action === "edit-user") {
        if (store.role !== "ADMIN") return toast("只有管理员可编辑用户", "err");
        const u = state.users.find(x => String(pick(x, ["id"])) === String(id));
        if (!u) return;
        $("#uId").value = pick(u, ["id"]);
        $("#uUsername").value = pick(u, ["username"]);
        $("#uPassword").value = "";
        $("#uRole").value = pick(u, ["role"]) || "TEACHER";
        $("#userFormTitle").textContent = "编辑用户";
        switchPage("pageUsers");
      }
      if (action === "edit-classroom") {
        const c = state.classrooms.find(x => String(pick(x, ["id"])) === String(id));
        if (!c) return;
        $("#crId").value = pick(c, ["id"]);
        $("#crName").value = pick(c, ["roomName", "room_name", "name", "classroomName", "classroom_name", "title"], "");
        $("#crLocation").value = pick(c, ["equipment", "location", "addr", "place"], "");
        $("#crCapacity").value = pick(c, ["capacity", "cap"], "");
        const currentStatus = pick(c, ["status"], "FREE");
        $("#crStatus").value = currentStatus;
        $("#classroomFormTitle").textContent = "编辑课室";
        switchPage("pageClassrooms");
      }
      if (action === "edit-course") {
        const c = state.courses.find(x => String(pick(x, ["id"])) === String(id));
        if (!c) return;
        $("#coId").value = pick(c, ["id"]);
        $("#coName").value = pick(c, ["courseName", "course_name", "name", "title"], "");
        $("#coCode").value = pick(c, ["id", "code", "courseCode", "course_code"], "");
        $("#coTeacher").value = pick(c, ["teacher", "teacherName", "instructor"], "");
        $("#coRemark").value = pick(c, ["remark"], "");
        $("#courseFormTitle").textContent = "编辑课程";
        switchPage("pageCourses");
      }
      if (action === "edit-schedule") {
        // 确保下拉框选项已填充
        setTimeout(() => {
          $("#editSchClassroom").innerHTML = $("#schClassroom").innerHTML;
          $("#editSchCourse").innerHTML = $("#schCourse").innerHTML;
        }, 100);
        
        const s = state.schedules.find(x => String(pick(x, ["id"])) === String(id));
        if (!s) {
          toast("找不到对应的预约记录", "err");
          return;
        }
        
        // 填充编辑弹窗表单
        $("#editSchId").value = pick(s, ["id"], "");
        $("#editSchClassroom").value = pick(s, ["classroomId", "classroom_id", "roomId", "room_id"], "");
        $("#editSchCourse").value = pick(s, ["courseId", "course_id", "course"], "");
        $("#editSchDate").value = pick(s, ["date", "scheduleDate", "day"], "");
        $("#editSchStart").value = pick(s, ["startTime", "start_time", "beginTime"], "");
        $("#editSchEnd").value = pick(s, ["endTime", "end_time", "finishTime"], "");
        $("#editSchTeacher").value = pick(s, ["teacher", "teacherName"], "");
        $("#editSchRemark").value = pick(s, ["remark"], "");
        
        // 确保值已设置后打开弹窗
        setTimeout(() => {
          $("#scheduleEditModalMask").classList.remove("hidden");
          $("#scheduleEditModal").classList.remove("hidden");
        }, 150);
      }
    } catch (err) {
      toast(err.message || "操作失败", "err");
    }
  });
}

function initTopActions() {
  $("#btnLogout").addEventListener("click", () => {
    // 清除定时器
    if (window.classroomStatusInterval) {
      clearInterval(window.classroomStatusInterval);
      window.classroomStatusInterval = null;
    }
    clearAuth();
    toast("已退出");
    showViewAuth();
  });

  $("#btnRefresh").addEventListener("click", async () => {
    try {
      await bootstrapData();
      toast("已刷新");
    } catch (err) {
      toast(err.message || "刷新失败", "err");
    }
  });

  const open = () => {
    $("#apiBaseModal").value = store.apiBase;
    $("#authPrefixModal").value = store.authPrefix;
    $("#settingsInfo").textContent = `API Base = ${store.apiBase}\nAuthorization Prefix = ${JSON.stringify(store.authPrefix)}`;
    $("#modalMask").classList.remove("hidden");
    $("#settingsModal").classList.remove("hidden");
  };
  const close = () => {
    $("#modalMask").classList.add("hidden");
    $("#settingsModal").classList.add("hidden");
  };
  $("#btnSettings").addEventListener("click", open);
  $("#btnCloseModal").addEventListener("click", close);
  $("#modalMask").addEventListener("click", close);

  $("#btnSaveSettings").addEventListener("click", () => {
    store.apiBase = $("#apiBaseModal").value.trim() || "http://localhost:8080";
    store.authPrefix = $("#authPrefixModal").value || "";
    saveSettings();
    toast("设置已保存");
    close();
  });
  $("#btnResetSettings").addEventListener("click", () => {
    store.apiBase = "http://localhost:8080";
    store.authPrefix = "";
    saveSettings();
    $("#apiBaseModal").value = store.apiBase;
    $("#authPrefixModal").value = store.authPrefix;
    $("#settingsInfo").textContent = `API Base = ${store.apiBase}\nAuthorization Prefix = ${JSON.stringify(store.authPrefix)}`;
    toast("已恢复默认");
  });

  // 初始化预约编辑弹窗
  initScheduleEditModal();
}

function initScheduleEditModal() {
  const openModal = () => {
    $("#scheduleEditModalMask").classList.remove("hidden");
    $("#scheduleEditModal").classList.remove("hidden");
  };
  
  const closeModal = () => {
    $("#scheduleEditModalMask").classList.add("hidden");
    $("#scheduleEditModal").classList.add("hidden");
  };
  
  $("#btnCloseScheduleEditModal").addEventListener("click", closeModal);
  $("#scheduleEditModalMask").addEventListener("click", (e) => {
    if (e.target === $("#scheduleEditModalMask")) {
      closeModal();
    }
  });
  
  $("#btnSaveScheduleEdit").addEventListener("click", async () => {
    try {
      const id = $("#editSchId").value.trim();
      if (!id) {
        toast("预约ID不能为空", "err");
        return;
      }
      
      const startTime = $("#editSchStart").value;
      const endTime = $("#editSchEnd").value;
      if (startTime && endTime && startTime >= endTime) {
        toast("结束时间必须晚于开始时间", "err");
        return;
      }

      const classroomId = $("#editSchClassroom").value;
      const courseId = $("#editSchCourse").value;
      const teacher = ($("#editSchTeacher").value || "").trim() || store.username || "";
      const date = $("#editSchDate").value;
      const weekDay = calcWeekDay(date);
      if (!weekDay) {
        toast("日期不合法，无法计算星期", "err");
        return;
      }

      const remarkVal = ($("#editSchRemark").value || "").trim();

      const payload = {
        id: id,
        classroomId: classroomId,
        courseId: courseId,
        teacher: teacher,
        date: date, // 添加日期字段
        weekDay: weekDay,
        startTime: startTime,
        endTime: endTime,
        ...(remarkVal ? { remark: remarkVal } : {}),
      };

      const result = await apiFetch("/api/schedule/update", { method: "PUT", body: payload });
      toast("预约更新成功");
      closeModal();
      await loadSchedulesAll();
      await loadMySchedules().catch(() => { });
    } catch (err) {
      console.error("更新预约失败:", err);
      toast(err.message || "更新失败", "err");
    }
  });
}

/* ========= 进入系统 & 初始化 ========= */

async function bootstrapData() {
  // 基础数据并行
  await Promise.allSettled([loadClassrooms(), loadCourses()]);
  await loadSchedulesAll();
}

async function enterApp() {
  showViewApp();
  setWhoAmI();

  // 管理员才显示用户页入口
  const isAdmin = store.role === "ADMIN";
  $("#tabUsers").style.display = isAdmin ? "" : "none";

  // 默认教师名
  $("#schTeacher").value = store.username || "";

  switchPage("pageDashboard");
  $("#filterType").dispatchEvent(new Event("change"));

  await bootstrapData();
}

(function init() {
  initAuthTabs();
  initLoginRegister();
  initTabs();
  initDashboardQuick();
  initForms();
  initTableActions();
  initTopActions();

  if (store.token && store.username) {
    enterApp().catch(err => {
      toast(err.message || "自动登录失败，请重新登录", "err");
      clearAuth();
      showViewAuth();
    });
  } else {
    showViewAuth();
  }
})();

// 在页面卸载时清除定时器
window.addEventListener('beforeunload', () => {
  if (window.classroomStatusInterval) {
    clearInterval(window.classroomStatusInterval);
  }
});
