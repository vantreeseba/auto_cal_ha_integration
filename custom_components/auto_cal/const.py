DOMAIN = "auto_cal"

CONF_URL = "url"
CONF_API_KEY = "api_key"

DEFAULT_SCAN_INTERVAL = 15  # minutes

PLATFORMS = ["binary_sensor", "button", "calendar", "sensor", "todo"]

# Number of trailing habit periods to request for the completion-rate sensor.
HABIT_DETAIL_PERIODS = 8
