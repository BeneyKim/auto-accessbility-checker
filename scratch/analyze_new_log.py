import json

with open("log/냉동고-debug-log-20260529-010833.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for i, log in enumerate(data.get("logs", [])):
    msg = log.get("message", "")
    log_data = log.get("data", {})
    
    # We look for transition, depth pushed, depth popped, branch activation, overlay detection, etc.
    if any(k in msg.lower() for k in ["depth", "transition", "overlay", "branch", "restore"]):
        print(f"Log #{i} (timestamp: {log.get('timestamp')}):")
        print(f"  Message: {msg}")
        if isinstance(log_data, dict):
            # Print only key summary fields to avoid spamming
            summary_data = {}
            for key in ["fromDepth", "toDepth", "triggerName", "classification", "reason", "branch", "accepted", "restored", "method", "targetTitle", "currentTitle", "overlayCount", "signature"]:
                if key in log_data:
                    summary_data[key] = log_data[key]
            if "before" in log_data and isinstance(log_data["before"], dict):
                summary_data["before"] = {k: log_data["before"][k] for k in ["title", "overlayCount", "signature"] if k in log_data["before"]}
            if "after" in log_data and isinstance(log_data["after"], dict):
                summary_data["after"] = {k: log_data["after"][k] for k in ["title", "overlayCount", "signature"] if k in log_data["after"]}
            if "snapshot" in log_data and isinstance(log_data["snapshot"], dict):
                summary_data["snapshot"] = {k: log_data["snapshot"][k] for k in ["title", "overlayCount", "signature"] if k in log_data["snapshot"]}
            
            print(f"  Summary Data: {json.dumps(summary_data, indent=2, ensure_ascii=False)}")
        else:
            print(f"  Data: {log_data}")
        print("-" * 50)
