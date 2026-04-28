SIGNS = [
    ("Aries", "a", 0), ("Taurus", "b", 30), ("Gemini", "c", 60),
    ("Cancer", "d", 90), ("Leo", "e", 120), ("Virgo", "f", 150),
    ("Libra", "g", 180), ("Scorpio", "h", 210), ("Sagittarius", "i", 240),
    ("Capricorn", "j", 270), ("Aquarius", "k", 300), ("Pisces", "l", 330),
]
SIGN_CODE_MAPPING = {code: {"sign_name": name, "start_degree": start} for name, code, start in SIGNS}
SIGN_NAMES = [s[0] for s in SIGNS]
SIGN_CODES = [s[1] for s in SIGNS]

# Astrodienst midpoint ephemeris-style code set observed in the uploaded package.
# K differs across historical tables; keep it configurable. Default uses mean node.
DEFAULT_BODY_CODES = {
    "A": "Sun",
    "C": "Moon",
    "D": "Mercury",
    "E": "Venus",
    "F": "Jupiter",
    "G": "Saturn",
    "O": "Uranus",
    "I": "Neptune",
    "J": "Pluto",
    "K": "Mean Node",
}

STANDARD_BODIES = [
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
    "Uranus", "Neptune", "Pluto", "True Node", "Mean Node", "Chiron",
]
ASPECTS = {
    "conjunction": 0,
    "sextile": 60,
    "square": 90,
    "trine": 120,
    "opposition": 180,
}
