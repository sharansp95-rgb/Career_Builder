import requests
import json
res = requests.post("http://127.0.0.1:5000/api/recruit_candidates", json={
    "jobDescription": "node js"
})
with open("test_out.json", "w") as f:
    json.dump(res.json(), f, indent=2)
