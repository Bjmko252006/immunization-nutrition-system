"""WHO Child Growth Standards (2006) Z-score engine using the LMS method.

Indicators: WAZ (weight-for-age), HAZ (length/height-for-age), WHZ (weight-for-length/height).
Ages 0-60 months. Input JSON on stdin, output JSON on stdout:
  {"sex": "male"|"female", "age_months": 17.5, "weight_kg": 9.8, "height_cm": 78.2}
"""
import json, math, os, sys

_HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_HERE, 'who_tables.json'), encoding='utf-8') as _f:
    TABLES = json.load(_f)


class InputError(ValueError):
    pass


def _lms_at(table, x):
    """Linear interpolation of L, M, S and the SD cut-offs at position x."""
    if x < table[0]['x'] or x > table[-1]['x']:
        raise InputError('value out of WHO table range')
    for lo, hi in zip(table, table[1:]):
        if lo['x'] <= x <= hi['x']:
            t = 0.0 if hi['x'] == lo['x'] else (x - lo['x']) / (hi['x'] - lo['x'])
            return {k: lo[k] + t * (hi[k] - lo[k]) for k in ('L', 'M', 'S', 'sd2neg', 'sd3neg', 'sd2', 'sd3')}
    return dict(table[-1])


def _z_lms(value, p):
    L, M, S = p['L'], p['M'], p['S']
    if L == 0:
        return math.log(value / M) / S
    return ((value / M) ** L - 1) / (L * S)


def zscore(value, p, adjust_extremes):
    z = _z_lms(value, p)
    if adjust_extremes:  # WHO restricted adjustment beyond +/-3 SD (weight indicators)
        if z > 3:
            z = 3 + (value - p['sd3']) / (p['sd3'] - p['sd2'])
        elif z < -3:
            z = -3 + (value - p['sd3neg']) / (p['sd2neg'] - p['sd3neg'])
    return z


def grade(z):
    if z < -3:
        return 'Severe'
    if z < -2:
        return 'Moderate'
    if z <= 2:
        return 'Normal'
    return 'Above Normal'


def assess(sex, age_months, weight_kg, height_cm):
    sex = {'male': 'boys', 'female': 'girls'}.get(str(sex).lower())
    if sex is None:
        raise InputError('sex must be male or female')
    try:
        age, w, h = float(age_months), float(weight_kg), float(height_cm)
    except (TypeError, ValueError):
        raise InputError('age, weight and height must be numbers')
    if not (0 <= age <= 60):
        raise InputError('age must be 0 to 60 months')
    if not (1 <= w <= 30):
        raise InputError('weight must be 1 to 30 kg')
    if not (35 <= h <= 130):
        raise InputError('height/length must be 35 to 130 cm')
    grp = 'lt24' if age < 24 else 'ge24'
    waz = zscore(w, _lms_at(TABLES[f'wfa|{sex}|all'], age), True)
    haz = zscore(h, _lms_at(TABLES[f'lhfa|{sex}|{grp}'], age), False)
    whz = zscore(w, _lms_at(TABLES[f"{'wfl' if grp == 'lt24' else 'wfh'}|{sex}|{grp}"], h), True)
    grades = {'waz': grade(waz), 'haz': grade(haz), 'whz': grade(whz)}
    order = {'Severe': 3, 'Moderate': 2}
    worst = max(grades.values(), key=lambda g: order.get(g, 0))
    if order.get(worst, 0) == 0:
        risk = 'Above Normal' if 'Above Normal' in grades.values() else 'Normal'
    else:
        risk = worst
    return {
        'waz': round(waz, 2), 'haz': round(haz, 2), 'whz': round(whz, 2),
        'waz_grade': grades['waz'], 'haz_grade': grades['haz'], 'whz_grade': grades['whz'],
        'risk_classification': risk,
    }


if __name__ == '__main__':
    try:
        data = json.load(sys.stdin)
        print(json.dumps(assess(data.get('sex'), data.get('age_months'), data.get('weight_kg'), data.get('height_cm'))))
    except InputError as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(2)
