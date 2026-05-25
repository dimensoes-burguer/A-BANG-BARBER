(function () {
  "use strict";

  const CONFIG = {
    shopName: "A BANG' BARBER",
    address:
      "Av. Sen. Canedo, 2339 - Res. Rio Araguaia, Sen. Canedo - GO, 75250-000",
    mapLink: "https://maps.app.goo.gl/sZcurn4C1Aouc3396",
    mainWhatsapp: "062992719947",
    adminUser: "admin",
    adminPassword: "admin123",
    openMinutes: 8 * 60,
    closeMinutes: 20 * 60,
    slotStep: 15,
  };

  const STORAGE = {
    services: "abangbarber.services",
    professionals: "abangbarber.professionals",
    appointments: "abangbarber.appointments",
  };

  const DEFAULT_SERVICES = [
    { id: "svc-corte", name: "Corte masculino", duration: 60, price: 35 },
    { id: "svc-corte-barba", name: "Corte + Barba", duration: 90, price: 60 },
    { id: "svc-barba", name: "Barba completa", duration: 45, price: 30 },
    { id: "svc-sobrancelha", name: "Sobrancelha", duration: 15, price: 15 },
    { id: "svc-infantil", name: "Corte infantil", duration: 45, price: 30 },
  ];

  const DEFAULT_PROFESSIONALS = [
    {
      id: "pro-bruno",
      name: "Bruno Lima",
      whatsapp: "062992719947",
      available: true,
    },
    {
      id: "pro-diego",
      name: "Diego Santos",
      whatsapp: "62992719947",
      available: true,
    },
    {
      id: "pro-rafael",
      name: "Rafael Oliveira",
      whatsapp: "62992719947",
      available: false,
    },
  ];

  const state = {
    services: [],
    professionals: [],
    appointments: [],
    monthDate: startOfMonth(new Date()),
    scheduleDate: null,
    pendingSlot: null,
    selectedReservation: null,
    lastAppointment: null,
    activeAdminTab: "reports",
    activeAppointmentTab: "pending",
    editingAppointmentSnapshot: null,
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindElements();
    initLogoFallbacks();
    loadDatabase();
    seedReportDates();
    bindEvents();
    renderAll();
  }

  function bindElements() {
    const ids = [
      "calendarGrid",
      "monthLabel",
      "prevMonthBtn",
      "nextMonthBtn",
      "scheduleModal",
      "scheduleDateTitle",
      "professionalSelect",
      "serviceSelect",
      "timeSlots",
      "slotsInfo",
      "confirmSlotBtn",
      "cancelScheduleBtn",
      "selectionEmpty",
      "selectionSummary",
      "summaryDate",
      "summaryTime",
      "summaryProfessional",
      "summaryService",
      "summaryPrice",
      "summaryDuration",
      "clientForm",
      "clientName",
      "clientPhone",
      "clientNotes",
      "successModal",
      "successSummary",
      "sendWhatsappBtn",
      "closeSuccessBtn",
      "openLoginBtn",
      "loginModal",
      "loginForm",
      "closeLoginBtn",
      "adminUser",
      "adminPassword",
      "loginError",
      "adminPanel",
      "logoutBtn",
      "metricsGrid",
      "topServices",
      "topProfessionals",
      "todayQueue",
      "reportStart",
      "reportEnd",
      "reportPeriod",
      "refreshAdminBtn",
      "appointmentsList",
      "serviceForm",
      "serviceId",
      "serviceName",
      "serviceDuration",
      "servicePrice",
      "serviceSubmit",
      "cancelServiceEdit",
      "servicesList",
      "professionalForm",
      "professionalId",
      "professionalName",
      "professionalWhatsapp",
      "professionalStatus",
      "professionalSubmit",
      "cancelProfessionalEdit",
      "professionalsList",
      "appointmentModal",
      "appointmentForm",
      "appointmentId",
      "appointmentDate",
      "appointmentTime",
      "appointmentService",
      "appointmentProfessional",
      "appointmentClientName",
      "appointmentClientPhone",
      "appointmentNotes",
      "appointmentError",
      "closeAppointmentModal",
      "cancelAppointmentEdit",
      "toast",
    ];

    ids.forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    els.prevMonthBtn.addEventListener("click", () => changeMonth(-1));
    els.nextMonthBtn.addEventListener("click", () => changeMonth(1));

    els.calendarGrid.addEventListener("click", (event) => {
      const dayButton = event.target.closest("[data-date]");
      if (!dayButton || dayButton.disabled) return;
      openScheduleModal(dayButton.dataset.date);
    });

    els.professionalSelect.addEventListener("change", () => {
      state.pendingSlot = null;
      renderTimeSlots();
    });

    els.serviceSelect.addEventListener("change", () => {
      state.pendingSlot = null;
      renderTimeSlots();
    });

    els.timeSlots.addEventListener("click", (event) => {
      const slotButton = event.target.closest("[data-time]");
      if (!slotButton || slotButton.disabled) return;
      state.pendingSlot = slotButton.dataset.time;
      renderTimeSlots();
    });

    els.confirmSlotBtn.addEventListener("click", confirmPendingSlot);
    els.cancelScheduleBtn.addEventListener("click", () => closeDialog(els.scheduleModal));
    els.clientForm.addEventListener("submit", createClientAppointment);

    els.closeSuccessBtn.addEventListener("click", () => closeDialog(els.successModal));
    els.sendWhatsappBtn.addEventListener("click", sendLastAppointmentToWhatsapp);

    els.openLoginBtn.addEventListener("click", () => openDialog(els.loginModal));
    els.closeLoginBtn.addEventListener("click", () => closeDialog(els.loginModal));
    els.loginForm.addEventListener("submit", handleLogin);
    els.logoutBtn.addEventListener("click", handleLogout);

    document.querySelectorAll("[data-admin-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeAdminTab = button.dataset.adminTab;
        renderAdminTabs();
      });
    });

    document.querySelectorAll("[data-appointment-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeAppointmentTab = button.dataset.appointmentTab;
        renderAppointmentTabs();
        renderAppointmentsList();
      });
    });

    els.reportPeriod.addEventListener("change", applyReportPeriod);
    els.reportStart.addEventListener("change", renderReports);
    els.reportEnd.addEventListener("change", renderReports);
    els.refreshAdminBtn.addEventListener("click", renderAdmin);

    els.appointmentsList.addEventListener("click", handleAppointmentAction);
    els.serviceForm.addEventListener("submit", saveService);
    els.cancelServiceEdit.addEventListener("click", resetServiceForm);
    els.servicesList.addEventListener("click", handleServiceAction);
    els.professionalForm.addEventListener("submit", saveProfessional);
    els.cancelProfessionalEdit.addEventListener("click", resetProfessionalForm);
    els.professionalsList.addEventListener("click", handleProfessionalAction);

    els.appointmentForm.addEventListener("submit", saveAppointmentEdit);
    els.closeAppointmentModal.addEventListener("click", closeAppointmentEditor);
    els.cancelAppointmentEdit.addEventListener("click", closeAppointmentEditor);
    ["appointmentDate", "appointmentService", "appointmentProfessional"].forEach((id) => {
      els[id].addEventListener("change", () => renderAppointmentTimeOptions());
    });

    window.addEventListener("storage", (event) => {
      if (Object.values(STORAGE).includes(event.key)) {
        loadDatabase();
        renderAll();
      }
    });
  }

  function initLogoFallbacks() {
    document.querySelectorAll("[data-logo-img]").forEach((img) => {
      const frame = img.closest(".logo-frame");
      if (!frame) return;

      const showFallback = () => frame.classList.add("logo-missing");
      const showImage = () => frame.classList.remove("logo-missing");

      img.addEventListener("error", showFallback);
      img.addEventListener("load", showImage);

      if (img.complete && img.naturalWidth === 0) {
        showFallback();
      }
    });
  }

  // This repository boundary keeps the app ready for Firebase later.
  function loadDatabase() {
    state.services = readCollection(STORAGE.services, DEFAULT_SERVICES);
    state.professionals = readCollection(STORAGE.professionals, DEFAULT_PROFESSIONALS);
    state.appointments = readCollection(STORAGE.appointments, []);
  }

  function readCollection(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.setItem(key, JSON.stringify(fallback));
        return clone(fallback);
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : clone(fallback);
    } catch (error) {
      console.warn("Falha ao ler dados locais", error);
      return clone(fallback);
    }
  }

  function saveCollection(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function renderAll() {
    renderCalendar();
    renderSelectionSummary();
    renderAdmin();
  }

  function renderCalendar() {
    const year = state.monthDate.getFullYear();
    const month = state.monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks = firstDay.getDay();
    const monthLabel = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(state.monthDate);

    els.monthLabel.textContent = capitalize(monthLabel);
    els.calendarGrid.innerHTML = "";

    for (let index = 0; index < blanks; index += 1) {
      const blank = document.createElement("button");
      blank.className = "calendar-day blank";
      blank.type = "button";
      blank.disabled = true;
      els.calendarGrid.appendChild(blank);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const dateKey = dateToKey(date);
      const isPast = isPastDate(dateKey);
      const full = !isPast && isDayFullyBooked(dateKey);
      const isToday = dateKey === todayKey();

      const button = document.createElement("button");
      button.type = "button";
      button.className = [
        "calendar-day",
        isPast ? "past" : "",
        full ? "full" : "",
        isToday ? "today" : "",
      ]
        .filter(Boolean)
        .join(" ");
      button.dataset.date = dateKey;
      button.disabled = isPast || full;
      button.setAttribute("aria-label", calendarDayLabel(dateKey, isPast, full));
      button.innerHTML = `
        <span class="day-number">${day}</span>
        <span class="day-status">${isPast ? "Passou" : full ? "Lotado" : "Disponivel"}</span>
      `;
      els.calendarGrid.appendChild(button);
    }
  }

  function calendarDayLabel(dateKey, isPast, full) {
    const status = isPast ? "indisponivel" : full ? "lotado" : "disponivel";
    return `${formatDateLong(dateKey)}, ${status}`;
  }

  function changeMonth(direction) {
    state.monthDate = new Date(
      state.monthDate.getFullYear(),
      state.monthDate.getMonth() + direction,
      1
    );
    renderCalendar();
  }

  function openScheduleModal(dateKey) {
    const availableProfessionals = getAvailableProfessionals();
    if (!availableProfessionals.length) {
      showToast("Nenhum profissional disponivel para reserva no momento.");
      return;
    }

    if (!state.services.length) {
      showToast("Nenhum servico cadastrado no momento.");
      return;
    }

    state.scheduleDate = dateKey;
    state.pendingSlot = null;
    els.scheduleDateTitle.textContent = formatDateLong(dateKey);
    renderScheduleControls();
    renderTimeSlots();
    openDialog(els.scheduleModal);
  }

  function renderScheduleControls() {
    els.professionalSelect.innerHTML = "";
    getAvailableProfessionals().forEach((professional) => {
      const option = document.createElement("option");
      option.value = professional.id;
      option.textContent = professional.name;
      els.professionalSelect.appendChild(option);
    });

    els.serviceSelect.innerHTML = "";
    state.services.forEach((service) => {
      const option = document.createElement("option");
      option.value = service.id;
      option.textContent = `${service.name} - ${service.duration} min - ${formatMoney(
        service.price
      )}`;
      els.serviceSelect.appendChild(option);
    });
  }

  function renderTimeSlots() {
    const professionalId = els.professionalSelect.value;
    const service = getServiceById(els.serviceSelect.value);
    const professional = getProfessionalById(professionalId);

    els.timeSlots.innerHTML = "";
    els.confirmSlotBtn.disabled = true;

    if (!state.scheduleDate || !service || !professional) {
      els.slotsInfo.textContent = "Selecione um profissional e um servico.";
      renderEmptySlots("Nao ha opcoes disponiveis para esta combinacao.");
      return;
    }

    const slots = buildSlots(state.scheduleDate, professionalId, service.duration);
    const availableCount = slots.filter((slot) => slot.available).length;
    const blocks = service.duration / CONFIG.slotStep;
    els.slotsInfo.textContent = `${service.name} ocupa ${blocks} bloco${
      blocks === 1 ? "" : "s"
    } de 15 minutos. ${availableCount} ${
      availableCount === 1 ? "horario disponivel" : "horarios disponiveis"
    }.`;

    if (!availableCount) {
      renderEmptySlots("Este profissional esta sem horarios livres neste dia.");
      return;
    }

    slots.forEach((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `slot-button${state.pendingSlot === slot.time ? " selected" : ""}`;
      button.dataset.time = slot.time;
      button.textContent = slot.time;
      button.disabled = !slot.available;
      button.title = slot.available ? `Selecionar ${slot.time}` : slot.reason;
      els.timeSlots.appendChild(button);
    });

    els.confirmSlotBtn.disabled = !state.pendingSlot;
  }

  function renderEmptySlots(message) {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.textContent = message;
    els.timeSlots.appendChild(div);
  }

  function confirmPendingSlot() {
    const service = getServiceById(els.serviceSelect.value);
    const professional = getProfessionalById(els.professionalSelect.value);

    if (!state.pendingSlot || !service || !professional) {
      showToast("Escolha profissional, servico e horario.");
      return;
    }

    if (
      !isSlotAvailable(
        state.scheduleDate,
        state.pendingSlot,
        service.duration,
        professional.id
      )
    ) {
      showToast("Esse horario acabou de ficar indisponivel. Escolha outro.");
      renderTimeSlots();
      renderCalendar();
      return;
    }

    state.selectedReservation = {
      date: state.scheduleDate,
      start: state.pendingSlot,
      end: addMinutesToTime(state.pendingSlot, service.duration),
      serviceId: service.id,
      professionalId: professional.id,
    };

    state.pendingSlot = null;
    closeDialog(els.scheduleModal);
    renderSelectionSummary();
    document.querySelector(".booking-panel").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function renderSelectionSummary() {
    const selection = hydrateSelection(state.selectedReservation);

    if (!selection) {
      els.selectionEmpty.classList.remove("hidden");
      els.selectionSummary.classList.add("hidden");
      return;
    }

    els.selectionEmpty.classList.add("hidden");
    els.selectionSummary.classList.remove("hidden");
    els.summaryDate.textContent = formatDateLong(selection.date);
    els.summaryTime.textContent = `${selection.start} as ${selection.end}`;
    els.summaryProfessional.textContent = selection.professional.name;
    els.summaryService.textContent = selection.service.name;
    els.summaryPrice.textContent = formatMoney(selection.service.price);
    els.summaryDuration.textContent = `${selection.service.duration} minutos`;
  }

  function hydrateSelection(selection) {
    if (!selection) return null;
    const service = getServiceById(selection.serviceId);
    const professional = getProfessionalById(selection.professionalId);
    if (!service || !professional) return null;
    return {
      ...selection,
      service,
      professional,
      end: addMinutesToTime(selection.start, service.duration),
    };
  }

  function createClientAppointment(event) {
    event.preventDefault();

    const selection = hydrateSelection(state.selectedReservation);
    if (!selection) {
      showToast("Escolha um dia, profissional, servico e horario antes de reservar.");
      return;
    }

    const customerName = els.clientName.value.trim();
    const customerPhone = els.clientPhone.value.trim();
    const notes = els.clientNotes.value.trim();

    if (!customerName || !customerPhone) {
      showToast("Preencha seu nome e WhatsApp.");
      return;
    }

    if (
      !isSlotAvailable(
        selection.date,
        selection.start,
        selection.service.duration,
        selection.professional.id
      )
    ) {
      showToast("Esse horario nao esta mais disponivel. Escolha outro horario.");
      state.selectedReservation = null;
      renderAll();
      return;
    }

    const appointment = {
      id: makeId("apt"),
      customerName,
      customerPhone,
      notes,
      date: selection.date,
      start: selection.start,
      end: selection.end,
      serviceId: selection.service.id,
      serviceName: selection.service.name,
      serviceDuration: Number(selection.service.duration),
      servicePrice: Number(selection.service.price),
      professionalId: selection.professional.id,
      professionalName: selection.professional.name,
      professionalWhatsapp: selection.professional.whatsapp,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.appointments.push(appointment);
    saveCollection(STORAGE.appointments, state.appointments);
    state.lastAppointment = appointment;
    state.selectedReservation = null;
    els.clientForm.reset();

    renderAll();
    showSuccessModal(appointment);
  }

  function showSuccessModal(appointment) {
    els.successSummary.innerHTML = `
      <p><strong>Cliente:</strong> ${escapeHtml(appointment.customerName)}</p>
      <p><strong>Telefone:</strong> ${escapeHtml(appointment.customerPhone)}</p>
      <p><strong>Servico:</strong> ${escapeHtml(appointment.serviceName)} - ${formatMoney(
        appointment.servicePrice
      )}</p>
      <p><strong>Dia:</strong> ${formatDateLong(appointment.date)}</p>
      <p><strong>Horario:</strong> ${appointment.start} as ${appointment.end}</p>
      <p><strong>Profissional:</strong> ${escapeHtml(appointment.professionalName)}</p>
      <p><strong>Observacoes:</strong> ${escapeHtml(appointment.notes || "Sem observacoes")}</p>
    `;
    openDialog(els.successModal);
  }

  function sendLastAppointmentToWhatsapp() {
    if (!state.lastAppointment) return;
    const link = buildWhatsappLink(state.lastAppointment);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  function buildWhatsappLink(appointment) {
    const number = normalizeWhatsapp(
      appointment.professionalWhatsapp || CONFIG.mainWhatsapp
    );
    const message = [
      `Ola, ${appointment.professionalName}! Nova reserva na ${CONFIG.shopName}.`,
      "",
      `Cliente: ${appointment.customerName}`,
      `Telefone: ${appointment.customerPhone}`,
      `Servico: ${appointment.serviceName}`,
      `Valor: ${formatMoney(appointment.servicePrice)}`,
      `Duracao: ${appointment.serviceDuration} minutos`,
      `Dia: ${formatDateLong(appointment.date)}`,
      `Horario: ${appointment.start} as ${appointment.end}`,
      `Profissional: ${appointment.professionalName}`,
      `Observacoes: ${appointment.notes || "Sem observacoes"}`,
      "",
      `Endereco: ${CONFIG.address}`,
      `Mapa: ${CONFIG.mapLink}`,
    ].join("\n");

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function handleLogin(event) {
    event.preventDefault();
    const user = els.adminUser.value.trim();
    const password = els.adminPassword.value;

    if (user === CONFIG.adminUser && password === CONFIG.adminPassword) {
      els.loginError.textContent = "";
      closeDialog(els.loginModal);
      els.loginForm.reset();
      els.adminPanel.classList.remove("hidden");
      renderAdmin();
      els.adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Painel administrativo aberto.");
      return;
    }

    els.loginError.textContent = "Usuario ou senha incorretos.";
  }

  function handleLogout() {
    els.adminPanel.classList.add("hidden");
    showToast("Painel administrativo fechado.");
  }

  function renderAdmin() {
    renderAdminTabs();
    renderReports();
    renderAppointmentsList();
    renderServicesList();
    renderProfessionalsList();
  }

  function renderAdminTabs() {
    document.querySelectorAll("[data-admin-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.adminTab === state.activeAdminTab);
    });

    document.querySelectorAll(".admin-section").forEach((section) => {
      section.classList.toggle("active", section.id === `admin-${state.activeAdminTab}`);
    });
  }

  function renderAppointmentTabs() {
    document.querySelectorAll("[data-appointment-tab]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.appointmentTab === state.activeAppointmentTab
      );
    });
  }

  function seedReportDates() {
    applyReportPeriod();
  }

  function applyReportPeriod() {
    const today = new Date();
    const period = els.reportPeriod.value || "month";

    if (period === "today") {
      els.reportStart.value = todayKey();
      els.reportEnd.value = todayKey();
    }

    if (period === "week") {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      els.reportStart.value = dateToKey(start);
      els.reportEnd.value = dateToKey(end);
    }

    if (period === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      els.reportStart.value = dateToKey(start);
      els.reportEnd.value = dateToKey(end);
    }

    if (period === "all") {
      els.reportStart.value = "";
      els.reportEnd.value = "";
    }

    renderReports();
  }

  function renderReports() {
    if (!els.metricsGrid) return;
    const appointments = appointmentsInReportRange();
    const pending = appointments.filter((item) => item.status === "pending");
    const finalized = appointments.filter((item) => item.status === "finalized");
    const canceled = appointments.filter((item) => item.status === "canceled");
    const todayAppointments = state.appointments.filter(
      (item) => item.date === todayKey() && item.status !== "canceled"
    );

    const metrics = [
      { label: "Total de agendamentos", value: appointments.length, tone: "gold" },
      { label: "Agendamentos de hoje", value: todayAppointments.length, tone: "gold" },
      { label: "Pendentes", value: pending.length, tone: "" },
      { label: "Finalizados", value: finalized.length, tone: "green" },
      { label: "Cancelados", value: canceled.length, tone: "red" },
      {
        label: "Faturamento previsto",
        value: formatMoney(sumPrices(pending)),
        tone: "gold",
      },
      {
        label: "Faturamento finalizado",
        value: formatMoney(sumPrices(finalized)),
        tone: "green",
      },
      {
        label: "Ticket medio",
        value: formatMoney(appointments.length ? sumPrices(appointments) / appointments.length : 0),
        tone: "",
      },
    ];

    els.metricsGrid.innerHTML = metrics
      .map(
        (metric) => `
          <article class="metric-card ${metric.tone}">
            <p>${metric.label}</p>
            <strong>${metric.value}</strong>
          </article>
        `
      )
      .join("");

    renderRankList(els.topServices, rankBy(appointments, "serviceName"));
    renderRankList(els.topProfessionals, rankBy(appointments, "professionalName"));
    renderTodayQueue();
  }

  function appointmentsInReportRange() {
    const start = els.reportStart.value;
    const end = els.reportEnd.value;
    return state.appointments.filter((appointment) => {
      if (start && appointment.date < start) return false;
      if (end && appointment.date > end) return false;
      return true;
    });
  }

  function renderRankList(container, rows) {
    if (!rows.length) {
      container.innerHTML = `<div class="empty-state">Sem dados neste periodo.</div>`;
      return;
    }

    container.innerHTML = rows
      .slice(0, 6)
      .map(
        (row, index) => `
          <div class="rank-row">
            <strong>${index + 1}. ${escapeHtml(row.name)}</strong>
            <span>${row.count} agendamento${row.count === 1 ? "" : "s"}</span>
          </div>
        `
      )
      .join("");
  }

  function renderTodayQueue() {
    const rows = state.appointments
      .filter((item) => item.date === todayKey() && item.status === "pending")
      .sort(compareAppointments)
      .slice(0, 8);

    if (!rows.length) {
      els.todayQueue.innerHTML = `<div class="empty-state">Nenhum horario pendente hoje.</div>`;
      return;
    }

    els.todayQueue.innerHTML = rows
      .map(
        (item) => `
          <div class="compact-item">
            <strong>${item.start} - ${escapeHtml(item.customerName)}</strong>
            <span>${escapeHtml(item.professionalName)}</span>
          </div>
        `
      )
      .join("");
  }

  function renderAppointmentsList() {
    const status = state.activeAppointmentTab === "finalized" ? "finalized" : "pending";
    const rows = state.appointments.filter((appointment) => appointment.status === status);

    renderAppointmentTabs();

    if (!rows.length) {
      els.appointmentsList.innerHTML = `<div class="empty-state">Nenhum agendamento ${
        status === "pending" ? "pendente" : "finalizado"
      }.</div>`;
      return;
    }

    els.appointmentsList.innerHTML = rows
      .sort(compareAppointments)
      .map((appointment) => appointmentCardTemplate(appointment))
      .join("");
  }

  function appointmentCardTemplate(appointment) {
    const finalized = appointment.status === "finalized";
    return `
      <article class="appointment-card ${appointment.status}">
        <div class="card-top">
          <div>
            <h4>${escapeHtml(appointment.customerName)}</h4>
            <p class="micro-label">${formatDateShort(appointment.date)} - ${
              appointment.start
            } as ${appointment.end}</p>
          </div>
          <span class="status-pill ${appointment.status}">${statusLabel(
            appointment.status
          )}</span>
        </div>
        <div class="details-grid">
          ${detailItem("Telefone", appointment.customerPhone)}
          ${detailItem("Servico", appointment.serviceName)}
          ${detailItem("Valor", formatMoney(appointment.servicePrice))}
          ${detailItem("Duracao", `${appointment.serviceDuration} min`)}
          ${detailItem("Dia", formatDateShort(appointment.date))}
          ${detailItem("Horario", `${appointment.start} as ${appointment.end}`)}
          ${detailItem("Profissional", appointment.professionalName)}
          ${detailItem("Observacoes", appointment.notes || "Sem observacoes")}
        </div>
        <div class="card-actions">
          ${
            finalized
              ? `<button class="mini-button" type="button" data-action="view-appointment" data-id="${appointment.id}">Ver detalhes</button>`
              : `
                <button class="mini-button" type="button" data-action="edit-appointment" data-id="${appointment.id}">Editar</button>
                <button class="success-button" type="button" data-action="finalize-appointment" data-id="${appointment.id}">Marcar como finalizado</button>
                <button class="danger-button" type="button" data-action="cancel-appointment" data-id="${appointment.id}">Cancelar</button>
              `
          }
          <button class="danger-button" type="button" data-action="delete-appointment" data-id="${
            appointment.id
          }">Excluir</button>
        </div>
      </article>
    `;
  }

  function handleAppointmentAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const appointment = getAppointmentById(button.dataset.id);
    if (!appointment) return;

    const action = button.dataset.action;

    if (action === "edit-appointment" || action === "view-appointment") {
      openAppointmentEditor(appointment, action === "view-appointment");
    }

    if (action === "finalize-appointment") {
      updateAppointmentStatus(appointment.id, "finalized");
    }

    if (action === "cancel-appointment") {
      updateAppointmentStatus(appointment.id, "canceled");
    }

    if (action === "delete-appointment") {
      const ok = window.confirm("Excluir este agendamento definitivamente?");
      if (!ok) return;
      state.appointments = state.appointments.filter((item) => item.id !== appointment.id);
      saveCollection(STORAGE.appointments, state.appointments);
      renderAll();
      showToast("Agendamento excluido.");
    }
  }

  function updateAppointmentStatus(id, status) {
    state.appointments = state.appointments.map((appointment) =>
      appointment.id === id
        ? { ...appointment, status, updatedAt: new Date().toISOString() }
        : appointment
    );
    saveCollection(STORAGE.appointments, state.appointments);
    renderAll();
    showToast(`Agendamento marcado como ${statusLabel(status).toLowerCase()}.`);
  }

  function openAppointmentEditor(appointment, viewOnly) {
    state.editingAppointmentSnapshot = { ...appointment };
    els.appointmentId.value = appointment.id;
    els.appointmentDate.value = appointment.date;
    els.appointmentClientName.value = appointment.customerName;
    els.appointmentClientPhone.value = appointment.customerPhone;
    els.appointmentNotes.value = appointment.notes || "";
    els.appointmentError.textContent = "";

    populateAppointmentSelects(appointment);
    els.appointmentService.value = appointment.serviceId;
    els.appointmentProfessional.value = appointment.professionalId;
    renderAppointmentTimeOptions(appointment.start);

    const fields = els.appointmentForm.querySelectorAll("input, select, textarea");
    fields.forEach((field) => {
      if (field.id !== "appointmentId") field.disabled = viewOnly;
    });
    els.appointmentForm.querySelector(".primary-button").classList.toggle("hidden", viewOnly);
    els.appointmentForm.querySelector(".modal-heading h2").textContent = viewOnly
      ? "Detalhes do agendamento"
      : "Alterar agendamento";

    openDialog(els.appointmentModal);
  }

  function closeAppointmentEditor() {
    closeDialog(els.appointmentModal);
    state.editingAppointmentSnapshot = null;
    const fields = els.appointmentForm.querySelectorAll("input, select, textarea");
    fields.forEach((field) => {
      field.disabled = false;
    });
    els.appointmentForm.querySelector(".primary-button").classList.remove("hidden");
  }

  function populateAppointmentSelects(appointment) {
    const services = [...state.services];
    if (!services.some((service) => service.id === appointment.serviceId)) {
      services.push({
        id: appointment.serviceId,
        name: `${appointment.serviceName} (removido)`,
        duration: appointment.serviceDuration,
        price: appointment.servicePrice,
      });
    }

    els.appointmentService.innerHTML = services
      .map(
        (service) =>
          `<option value="${service.id}">${escapeHtml(service.name)} - ${
            service.duration
          } min - ${formatMoney(service.price)}</option>`
      )
      .join("");

    const professionals = [...state.professionals];
    if (
      !professionals.some((professional) => professional.id === appointment.professionalId)
    ) {
      professionals.push({
        id: appointment.professionalId,
        name: `${appointment.professionalName} (removido)`,
        whatsapp: appointment.professionalWhatsapp,
        available: true,
      });
    }

    els.appointmentProfessional.innerHTML = professionals
      .map((professional) => {
        const status = professional.available ? "" : " - indisponivel";
        return `<option value="${professional.id}">${escapeHtml(
          professional.name
        )}${status}</option>`;
      })
      .join("");
  }

  function renderAppointmentTimeOptions(preferredTime) {
    const appointment = getAppointmentById(els.appointmentId.value);
    if (!appointment) return;

    const service = getServiceForAppointmentEditor();
    const professionalId = els.appointmentProfessional.value;
    const date = els.appointmentDate.value;
    const selectedTime = preferredTime || els.appointmentTime.value || appointment.start;

    els.appointmentTime.innerHTML = "";

    if (!service || !professionalId || !date) return;

    for (let minutes = CONFIG.openMinutes; minutes < CONFIG.closeMinutes; minutes += CONFIG.slotStep) {
      const time = minutesToTime(minutes);
      const option = document.createElement("option");
      const available = isSlotOpenAndConflictFree(
        date,
        time,
        service.duration,
        professionalId,
        appointment.id
      );
      option.value = time;
      option.textContent = available || time === appointment.start ? time : `${time} - ocupado`;
      option.disabled = !available && time !== appointment.start;
      els.appointmentTime.appendChild(option);
    }

    els.appointmentTime.value = selectedTime;
    if (els.appointmentTime.value !== selectedTime) {
      els.appointmentTime.value = appointment.start;
    }
  }

  function saveAppointmentEdit(event) {
    event.preventDefault();

    const appointment = getAppointmentById(els.appointmentId.value);
    if (!appointment) return;

    const service = getServiceForAppointmentEditor();
    const professional = getProfessionalForAppointmentEditor();
    const date = els.appointmentDate.value;
    const start = els.appointmentTime.value;
    const customerName = els.appointmentClientName.value.trim();
    const customerPhone = els.appointmentClientPhone.value.trim();
    const notes = els.appointmentNotes.value.trim();

    if (!service || !professional || !date || !start || !customerName || !customerPhone) {
      els.appointmentError.textContent = "Preencha todos os campos obrigatorios.";
      return;
    }

    const scheduleChanged =
      appointment.date !== date ||
      appointment.start !== start ||
      appointment.serviceId !== service.id ||
      appointment.professionalId !== professional.id;

    if (scheduleChanged && isPastDate(date)) {
      els.appointmentError.textContent = "Nao e possivel agendar em dias passados.";
      return;
    }

    if (scheduleChanged && professional.available === false) {
      els.appointmentError.textContent =
        "Este profissional esta indisponivel. Escolha outro profissional.";
      return;
    }

    if (
      !isSlotOpenAndConflictFree(date, start, service.duration, professional.id, appointment.id)
    ) {
      els.appointmentError.textContent = "Horario em conflito ou fora do expediente.";
      return;
    }

    const updated = {
      ...appointment,
      customerName,
      customerPhone,
      notes,
      date,
      start,
      end: addMinutesToTime(start, service.duration),
      serviceId: service.id,
      serviceName: stripRemovedLabel(service.name),
      serviceDuration: Number(service.duration),
      servicePrice: Number(service.price),
      professionalId: professional.id,
      professionalName: stripRemovedLabel(professional.name),
      professionalWhatsapp: professional.whatsapp,
      updatedAt: new Date().toISOString(),
    };

    state.appointments = state.appointments.map((item) =>
      item.id === appointment.id ? updated : item
    );
    saveCollection(STORAGE.appointments, state.appointments);
    closeAppointmentEditor();
    renderAll();
    showToast("Agendamento atualizado.");
  }

  function getServiceForAppointmentEditor() {
    const id = els.appointmentService.value;
    const service = getServiceById(id);
    if (service) return service;
    const appointment = state.editingAppointmentSnapshot || getAppointmentById(els.appointmentId.value);
    if (appointment && appointment.serviceId === id) {
      return {
        id: appointment.serviceId,
        name: appointment.serviceName,
        duration: appointment.serviceDuration,
        price: appointment.servicePrice,
      };
    }
    return null;
  }

  function getProfessionalForAppointmentEditor() {
    const id = els.appointmentProfessional.value;
    const professional = getProfessionalById(id);
    if (professional) return professional;
    const appointment = state.editingAppointmentSnapshot || getAppointmentById(els.appointmentId.value);
    if (appointment && appointment.professionalId === id) {
      return {
        id: appointment.professionalId,
        name: appointment.professionalName,
        whatsapp: appointment.professionalWhatsapp,
        available: true,
      };
    }
    return null;
  }

  function saveService(event) {
    event.preventDefault();
    const id = els.serviceId.value || makeId("svc");
    const name = els.serviceName.value.trim();
    const duration = Number(els.serviceDuration.value);
    const price = Number(els.servicePrice.value);

    if (!name || !duration || duration < CONFIG.slotStep || duration % CONFIG.slotStep !== 0) {
      showToast("O tempo precisa ser multiplo de 15 minutos.");
      return;
    }

    const service = { id, name, duration, price };
    const exists = state.services.some((item) => item.id === id);
    state.services = exists
      ? state.services.map((item) => (item.id === id ? service : item))
      : [...state.services, service];

    saveCollection(STORAGE.services, state.services);
    resetServiceForm();
    renderAll();
    showToast(exists ? "Servico atualizado." : "Servico criado.");
  }

  function resetServiceForm() {
    els.serviceForm.reset();
    els.serviceId.value = "";
    els.serviceSubmit.textContent = "Salvar servico";
    els.cancelServiceEdit.classList.add("hidden");
  }

  function renderServicesList() {
    if (!state.services.length) {
      els.servicesList.innerHTML = `<div class="empty-state">Nenhum servico cadastrado.</div>`;
      return;
    }

    els.servicesList.innerHTML = state.services
      .map(
        (service) => `
          <article class="management-card">
            <div>
              <h4>${escapeHtml(service.name)}</h4>
              <div class="management-meta">
                <span>${service.duration} minutos</span>
                <span>${formatMoney(service.price)}</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="mini-button" type="button" data-action="edit-service" data-id="${service.id}">Editar</button>
              <button class="danger-button" type="button" data-action="delete-service" data-id="${service.id}">Apagar</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function handleServiceAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const service = getServiceById(button.dataset.id);
    if (!service) return;

    if (button.dataset.action === "edit-service") {
      els.serviceId.value = service.id;
      els.serviceName.value = service.name;
      els.serviceDuration.value = service.duration;
      els.servicePrice.value = service.price;
      els.serviceSubmit.textContent = "Atualizar servico";
      els.cancelServiceEdit.classList.remove("hidden");
      els.serviceName.focus();
    }

    if (button.dataset.action === "delete-service") {
      const ok = window.confirm("Apagar este servico? Agendamentos antigos mantem os dados salvos.");
      if (!ok) return;
      state.services = state.services.filter((item) => item.id !== service.id);
      saveCollection(STORAGE.services, state.services);
      resetServiceForm();
      renderAll();
      showToast("Servico apagado.");
    }
  }

  function saveProfessional(event) {
    event.preventDefault();
    const id = els.professionalId.value || makeId("pro");
    const name = els.professionalName.value.trim();
    const whatsapp = els.professionalWhatsapp.value.trim();
    const available = els.professionalStatus.value === "available";

    if (!name || !whatsapp) {
      showToast("Preencha nome e WhatsApp do profissional.");
      return;
    }

    const professional = { id, name, whatsapp, available };
    const exists = state.professionals.some((item) => item.id === id);
    state.professionals = exists
      ? state.professionals.map((item) => (item.id === id ? professional : item))
      : [...state.professionals, professional];

    saveCollection(STORAGE.professionals, state.professionals);
    resetProfessionalForm();
    renderAll();
    showToast(exists ? "Profissional atualizado." : "Profissional criado.");
  }

  function resetProfessionalForm() {
    els.professionalForm.reset();
    els.professionalId.value = "";
    els.professionalSubmit.textContent = "Salvar profissional";
    els.cancelProfessionalEdit.classList.add("hidden");
  }

  function renderProfessionalsList() {
    if (!state.professionals.length) {
      els.professionalsList.innerHTML = `<div class="empty-state">Nenhum profissional cadastrado.</div>`;
      return;
    }

    els.professionalsList.innerHTML = state.professionals
      .map((professional) => {
        const statusClass = professional.available ? "" : "unavailable";
        const statusText = professional.available ? "Disponivel" : "Indisponivel";
        return `
          <article class="management-card">
            <div>
              <h4>${escapeHtml(professional.name)}</h4>
              <div class="management-meta">
                <span>WhatsApp: ${escapeHtml(professional.whatsapp)}</span>
                <span class="status-pill ${statusClass}">${statusText}</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="toggle-status" type="button" data-action="toggle-professional" data-id="${professional.id}" aria-label="Alterar status de ${escapeHtml(
                professional.name
              )}">
                <span class="switch ${professional.available ? "" : "off"}"></span>
                ${statusText}
              </button>
              <button class="mini-button" type="button" data-action="edit-professional" data-id="${professional.id}">Editar</button>
              <button class="danger-button" type="button" data-action="delete-professional" data-id="${professional.id}">Apagar</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function handleProfessionalAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const professional = getProfessionalById(button.dataset.id);
    if (!professional) return;

    if (button.dataset.action === "toggle-professional") {
      state.professionals = state.professionals.map((item) =>
        item.id === professional.id ? { ...item, available: !item.available } : item
      );
      saveCollection(STORAGE.professionals, state.professionals);
      renderAll();
      showToast("Status do profissional atualizado.");
    }

    if (button.dataset.action === "edit-professional") {
      els.professionalId.value = professional.id;
      els.professionalName.value = professional.name;
      els.professionalWhatsapp.value = professional.whatsapp;
      els.professionalStatus.value = professional.available ? "available" : "unavailable";
      els.professionalSubmit.textContent = "Atualizar profissional";
      els.cancelProfessionalEdit.classList.remove("hidden");
      els.professionalName.focus();
    }

    if (button.dataset.action === "delete-professional") {
      const ok = window.confirm(
        "Apagar este profissional? Agendamentos antigos mantem os dados salvos."
      );
      if (!ok) return;
      state.professionals = state.professionals.filter((item) => item.id !== professional.id);
      saveCollection(STORAGE.professionals, state.professionals);
      resetProfessionalForm();
      renderAll();
      showToast("Profissional apagado.");
    }
  }

  function isDayFullyBooked(dateKey) {
    if (isPastDate(dateKey)) return false;
    const professionals = getAvailableProfessionals();
    if (!professionals.length || !state.services.length) return true;

    return !professionals.some((professional) =>
      state.services.some((service) =>
        buildSlots(dateKey, professional.id, service.duration).some((slot) => slot.available)
      )
    );
  }

  function buildSlots(dateKey, professionalId, duration, ignoreAppointmentId) {
    const slots = [];
    for (let minutes = CONFIG.openMinutes; minutes < CONFIG.closeMinutes; minutes += CONFIG.slotStep) {
      const time = minutesToTime(minutes);
      const end = minutes + duration;
      const available = isSlotAvailable(dateKey, time, duration, professionalId, ignoreAppointmentId);
      let reason = "Ocupado";

      if (isPastDate(dateKey)) reason = "Dia passado";
      if (end > CONFIG.closeMinutes) reason = "Fora do expediente";
      if (!getProfessionalById(professionalId)?.available) reason = "Profissional indisponivel";

      slots.push({ time, available, reason });
    }
    return slots;
  }

  function isSlotAvailable(dateKey, startTime, duration, professionalId, ignoreAppointmentId) {
    const professional = getProfessionalById(professionalId);
    if (!professional || !professional.available) return false;
    if (isPastDate(dateKey)) return false;
    return isSlotOpenAndConflictFree(
      dateKey,
      startTime,
      duration,
      professionalId,
      ignoreAppointmentId
    );
  }

  function isSlotOpenAndConflictFree(dateKey, startTime, duration, professionalId, ignoreAppointmentId) {
    const start = timeToMinutes(startTime);
    const end = start + Number(duration);
    if (start < CONFIG.openMinutes || end > CONFIG.closeMinutes) return false;
    if (start % CONFIG.slotStep !== 0 || Number(duration) % CONFIG.slotStep !== 0) return false;

    return !state.appointments.some((appointment) => {
      if (appointment.id === ignoreAppointmentId) return false;
      if (appointment.date !== dateKey) return false;
      if (appointment.professionalId !== professionalId) return false;
      if (appointment.status === "canceled") return false;

      const appointmentStart = timeToMinutes(appointment.start);
      const appointmentEnd = timeToMinutes(appointment.end);
      return start < appointmentEnd && end > appointmentStart;
    });
  }

  function getAvailableProfessionals() {
    return state.professionals.filter((professional) => professional.available);
  }

  function getServiceById(id) {
    return state.services.find((service) => service.id === id) || null;
  }

  function getProfessionalById(id) {
    return state.professionals.find((professional) => professional.id === id) || null;
  }

  function getAppointmentById(id) {
    return state.appointments.find((appointment) => appointment.id === id) || null;
  }

  function compareAppointments(a, b) {
    return `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`);
  }

  function detailItem(label, value) {
    return `
      <div class="detail-item">
        <span>${label}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </div>
    `;
  }

  function rankBy(appointments, key) {
    const map = new Map();
    appointments
      .filter((item) => item.status !== "canceled")
      .forEach((item) => {
        const name = item[key] || "Nao informado";
        map.set(name, (map.get(name) || 0) + 1);
      });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  function sumPrices(appointments) {
    return appointments.reduce((total, appointment) => total + Number(appointment.servicePrice || 0), 0);
  }

  function statusLabel(status) {
    const labels = {
      pending: "Pendente",
      finalized: "Finalizado",
      canceled: "Cancelado",
    };
    return labels[status] || status;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function todayKey() {
    return dateToKey(new Date());
  }

  function dateToKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateFromKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function isPastDate(dateKey) {
    return dateKey < todayKey();
  }

  function formatDateLong(dateKey) {
    return capitalize(
      new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(dateFromKey(dateKey))
    );
  }

  function formatDateShort(dateKey) {
    return new Intl.DateTimeFormat("pt-BR").format(dateFromKey(dateKey));
  }

  function minutesToTime(minutes) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minute = String(minutes % 60).padStart(2, "0");
    return `${hour}:${minute}`;
  }

  function timeToMinutes(time) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  }

  function addMinutesToTime(time, minutes) {
    return minutesToTime(timeToMinutes(time) + Number(minutes));
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value || 0));
  }

  function normalizeWhatsapp(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("0")) digits = digits.slice(1);
    if (!digits.startsWith("55")) digits = `55${digits}`;
    return digits;
  }

  function stripRemovedLabel(value) {
    return String(value).replace(" (removido)", "");
  }

  function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function openDialog(dialog) {
    if (dialog.open) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (!dialog.open) return;
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  let toastTimer = null;

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("show");
    }, 3000);
  }
})();
