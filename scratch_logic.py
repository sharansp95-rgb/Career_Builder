import json
from backend.model import extract_skills

resume_text = "Full Stack Developer. Skills: Node.js, Express, React, MongoDB, HTML, CSS. Can build REST APIs and integrate frontends."
job_query = "node js"

job_skills_set = set(extract_skills(job_query))
candidate_skills_set = set(extract_skills(resume_text))
print("job_skills_set:", job_skills_set)
print("candidate_skills_set:", candidate_skills_set)

missingSkills = sorted(list(job_skills_set - candidate_skills_set))
matchedSkills = sorted(list(job_skills_set & candidate_skills_set))
print("missing:", missingSkills)
print("matched:", matchedSkills)
