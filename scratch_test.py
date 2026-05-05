import re

_SKILLS = [
    "python",
    "java",
    "c++",
    "c#",
    "javascript",
    "typescript",
    "react",
    "next.js",
    "node.js",
    "express",
    "flask",
    "django",
    "fastapi",
    "html",
    "css",
    "tailwind",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "redis",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "pandas",
    "numpy",
    "machine learning",
    "deep learning",
    "nlp",
    "spacy",
    "transformers",
    "git",
    "linux",
    "rest api",
    "graphql",
    "figma",
]

def extract_skills(text: str) -> list[str]:
    text_lower = text.lower()
    found = set()
    for skill in _SKILLS:
        pattern = re.escape(skill).replace(r"\.", r"[.\s]+")
        if re.search(rf"(?<![a-z0-9]){pattern}(?![a-z0-9])", text_lower):
            found.add(skill)
    return [skill.upper() if len(skill) <= 3 else skill.title() for skill in sorted(found)]

print("Job Query:", extract_skills("node js"))
print("Candidate Resume:", extract_skills("Full Stack Developer. Skills: Node.js, Express, React, MongoDB, HTML, CSS. Can build REST APIs and integrate frontends."))
