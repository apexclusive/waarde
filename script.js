const form = document.querySelector("#valuation-form");
const privateSaleValueElement = document.querySelector("#private-sale-value");
const saleRepeatValueElement = document.querySelector("#sale-repeat-value");
const tradeInValueElement = document.querySelector("#trade-in-value");
const depreciationValueElement = document.querySelector("#depreciation-value");
const summaryPlateElement = document.querySelector("#summary-plate");
const summaryAgeElement = document.querySelector("#summary-age");
const summaryMileageElement = document.querySelector("#summary-mileage");
const summaryDemandElement = document.querySelector("#summary-demand");
const progressElement = document.querySelector("#progress");
const resultWrapElement = document.querySelector("#result-wrap");
const emptyStateElement = document.querySelector("#empty-state");
const resetButtonElement = document.querySelector("#reset-button");
const valuationSummaryElement = document.querySelector("#betalen-sub");
const resultFootnoteElement = document.querySelector("#result-footnote");
let hasSubmitted = false;

const formatCurrency = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const bodyTypeFactor = {
  hatchback: 0.98,
  sedan: 1,
  wagon: 1.02,
  suv: 1.06,
  van: 0.94,
};

const fuelTypeFactor = {
  petrol: 1,
  diesel: 0.94,
  hybrid: 1.05,
  electric: 1.08,
};

const conditionFactor = {
  excellent: 1.05,
  good: 1,
  fair: 0.92,
};

function normalizePlate(value) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .match(/.{1,2}/g)
    ?.join("-")
    .slice(0, 8) || "";
}

function calculateValuation(formData) {
  const currentYear = 2026;
  const buildYear = Number(formData.get("buildYear"));
  const mileage = Number(formData.get("mileage"));
  const listPrice = Number(formData.get("listPrice"));
  const bodyType = formData.get("bodyType");
  const fuelType = formData.get("fuelType");
  const condition = formData.get("condition");

  const age = Math.max(0, currentYear - buildYear);
  const baseRetention = Math.max(0.24, 0.86 - age * 0.075);
  const expectedMileage = age * 15000;
  const mileageDelta = mileage - expectedMileage;
  const mileageFactor = Math.max(0.82, Math.min(1.08, 1 - mileageDelta / 300000));
  const roundedMileageDelta = Math.round((mileageFactor - 1) * 1000) / 10;

  const marketFactor =
    bodyTypeFactor[bodyType] * fuelTypeFactor[fuelType] * conditionFactor[condition];
  const privateSaleValue = Math.round(listPrice * baseRetention * mileageFactor * marketFactor);
  const tradeInValue = Math.round(privateSaleValue * 0.88);
  const yearlyDepreciation = Math.max(
    900,
    Math.round((listPrice - privateSaleValue) / Math.max(age, 1))
  );

  return {
    age,
    privateSaleValue,
    tradeInValue,
    yearlyDepreciation,
    mileageCorrectionLabel: `${roundedMileageDelta.toLocaleString("nl-NL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`,
    demandLabel:
      fuelType === "electric" || fuelType === "hybrid"
        ? "Bovengemiddelde vraag"
        : bodyType === "suv"
          ? "Sterke vraag"
          : "Stabiele vraag",
  };
}

function updateOutput(formData) {
  const plate = normalizePlate(formData.get("licensePlate") || "");
  const valuation = calculateValuation(formData);
  const tradeGap = valuation.privateSaleValue - valuation.tradeInValue;

  privateSaleValueElement.textContent = formatCurrency.format(valuation.privateSaleValue);
  saleRepeatValueElement.textContent = formatCurrency.format(valuation.privateSaleValue);
  tradeInValueElement.textContent = formatCurrency.format(valuation.tradeInValue);
  depreciationValueElement.textContent = `${formatCurrency.format(valuation.yearlyDepreciation)} / jaar`;
  summaryPlateElement.textContent = plate || "Nog niet ingevuld";
  summaryAgeElement.textContent = `${valuation.age} jaar`;
  summaryMileageElement.textContent = valuation.mileageCorrectionLabel;
  summaryDemandElement.textContent = valuation.demandLabel;
  valuationSummaryElement.textContent = `Geschikte richtprijs voor verkoop als occasion · ${valuation.demandLabel.toLowerCase()}`;
  resultFootnoteElement.textContent = `Indicatieve prijsrichting voor dit moment. Verschil tussen verkoop en inruil: ${formatCurrency.format(tradeGap)}.`;
}

function updateScrollUi() {
  const scrollTop = window.scrollY;
  const scrollableHeight = document.body.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? scrollTop / scrollableHeight : 0;
  progressElement.style.transform = `scaleX(${progress})`;
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
      }
    });
  },
  {
    threshold: 0.06,
  }
);

document.querySelectorAll(".rv, .ey").forEach((element) => {
  revealObserver.observe(element);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  updateOutput(formData);
  hasSubmitted = true;
  emptyStateElement.style.display = "none";
  resultWrapElement.hidden = false;
  resultWrapElement.classList.add("show");
  setTimeout(() => {
    resultWrapElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
});

document.querySelector("#license-plate").addEventListener("input", (event) => {
  event.target.value = normalizePlate(event.target.value);

  if (hasSubmitted) {
    updateOutput(new FormData(form));
  }
});

form.querySelectorAll("input, select").forEach((element) => {
  if (element.id === "license-plate") {
    return;
  }

  element.addEventListener("input", () => {
    if (hasSubmitted) {
      updateOutput(new FormData(form));
    }
  });

  element.addEventListener("change", () => {
    if (hasSubmitted) {
      updateOutput(new FormData(form));
    }
  });
});

resetButtonElement.addEventListener("click", () => {
  form.reset();
  document.querySelector("#build-year").value = "2020";
  document.querySelector("#mileage").value = "68000";
  document.querySelector("#list-price").value = "32950";
  document.querySelector("#body-type").value = "suv";
  document.querySelector("#fuel-type").value = "petrol";
  document.querySelector("#condition").value = "good";
  hasSubmitted = false;
  emptyStateElement.style.display = "block";
  resultWrapElement.classList.remove("show");
  resultWrapElement.hidden = true;
  updateOutput(new FormData(form));
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", updateScrollUi, { passive: true });
document.querySelector("#yr").textContent = new Date().getFullYear();

updateOutput(new FormData(form));
updateScrollUi();
