# CampusPilot — Attendance Test Cases

## Formula
`attendance = attended / total × 100`

## Cases

### TC-01
Attended 18, total 24
Expected: 75%

### TC-02
Attended 17, total 25
Expected: 68%

### TC-03
Attended 20, total 20
Expected: 100%

### TC-04
Attended 0, total 10
Expected: 0%

### TC-05
Attended 0, total 0
Expected: "No classes recorded" or equivalent, not NaN/Infinity.

### TC-06
Attended 11, total 10
Expected: validation error.

### TC-07
Attended -1, total 10
Expected: validation error.

## Recovery calculation

For target 75%:
`(A + x)/(T + x) >= 0.75`

For 17/25:
x = 4? Check:
21/29 = 72.41% (not enough)
22/30 = 73.33% (not enough)
23/31 = 74.19% (not enough)
24/32 = 75% (target reached)
Expected: 7 consecutive attended classes.

The UI should describe this as an estimate based on the recorded numbers.
