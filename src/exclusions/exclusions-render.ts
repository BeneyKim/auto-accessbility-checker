document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.querySelector("#exclusions-table-body");
  if (!tbody) return;

  try {
    const res = await fetch("exclusions.json");
    const exclusions = await res.json();

    tbody.innerHTML = "";
    exclusions.forEach((item: any) => {
      const tr = document.createElement("tr");

      // Rule ID cell
      const tdRuleId = document.createElement("td");
      const spanRule = document.createElement("span");
      spanRule.className = "rule-id";
      spanRule.textContent = item.ruleId;
      tdRuleId.appendChild(spanRule);
      tr.appendChild(tdRuleId);

      // Violation message and scope cell
      const tdViolation = document.createElement("td");
      const divMsg = document.createElement("div");
      divMsg.className = "violation-msg";
      divMsg.textContent = item.message;
      tdViolation.appendChild(divMsg);

      const divScope = document.createElement("div");
      divScope.className = "meta-tag";
      divScope.textContent = `범위: ${item.scope}`;
      tdViolation.appendChild(divScope);
      tr.appendChild(tdViolation);

      // Reason cell
      const tdReason = document.createElement("td");
      const divReason = document.createElement("div");
      divReason.className = "reason-text";
      divReason.textContent = item.reason;
      tdReason.appendChild(divReason);
      tr.appendChild(tdReason);

      // Status / Due Date cell
      const tdStatus = document.createElement("td");
      const spanStatus = document.createElement("span");
      const isNoPlan = item.status.includes("수정 계획 없음");
      spanStatus.className = `badge-status ${isNoPlan ? "no-plan" : "deferred"}`;
      spanStatus.textContent = item.status;
      tdStatus.appendChild(spanStatus);

      const divDue = document.createElement("div");
      divDue.className = "meta-tag";
      divDue.textContent = `기한: ${item.dueDate}`;
      tdStatus.appendChild(divDue);
      tr.appendChild(tdStatus);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load exclusions:", err);
  }
});
