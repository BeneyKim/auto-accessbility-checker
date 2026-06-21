import json

with open("log/냉동고-debug-log-20260525-233254.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for i, log in enumerate(data.get("logs", [])):
    msg = log.get("message", "")
    log_data = log.get("data", {})
    if "취소" in str(log_data) or "취소" in msg:
        print(f"Log #{i} (timestamp: {log.get('timestamp')}):")
        print(f"  Message: {msg}")
        print(f"  Data: {json.dumps(log_data, indent=2, ensure_ascii=False)}")
        print("-" * 50)
