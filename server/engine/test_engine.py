import math, unittest
from who_engine import assess, _lms_at, TABLES, _z_lms, InputError

class T(unittest.TestCase):
    def test_median_is_zero(self):
        # a child exactly at the WHO median has Z = 0 on every indicator
        for sex_key, sex in (('boys', 'male'), ('girls', 'female')):
            for age in (0, 6, 12, 18, 30, 48, 60):
                grp = 'lt24' if age < 24 else 'ge24'
                w = _lms_at(TABLES[f'wfa|{sex_key}|all'], age)['M']
                h = _lms_at(TABLES[f'lhfa|{sex_key}|{grp}'], age)['M']
                r = assess(sex, age, w, h)
                self.assertAlmostEqual(r['waz'], 0, places=2)
                self.assertAlmostEqual(r['haz'], 0, places=2)

    def test_published_cutoffs(self):
        # The WHO tables publish weights at -3, -2, +2, +3 SD rounded to 0.1 kg.
        # The LMS formula must reproduce them within that rounding (0.05 kg).
        for sex in ('boys', 'girls'):
            for row in TABLES[f'wfa|{sex}|all']:
                L, M, S = row['L'], row['M'], row['S']
                for z, key in ((-3, 'sd3neg'), (-2, 'sd2neg'), (2, 'sd2'), (3, 'sd3')):
                    x = M * (1 + L * S * z) ** (1 / L) if L != 0 else M * math.exp(S * z)
                    self.assertAlmostEqual(x, row[key], delta=0.06)

    def test_known_child(self):
        # boy, 12 months, 7.0 kg, 70 cm  -> underweight and stunting expected
        r = assess('male', 12, 7.0, 70.0)
        self.assertEqual(r['waz_grade'], 'Moderate')
        self.assertLess(r['haz'], -2)

    def test_normal_child(self):
        r = assess('female', 24, 12.0, 86.4)
        self.assertEqual(r['risk_classification'], 'Normal')

    def test_severe(self):
        r = assess('male', 12, 5.5, 66.0)
        self.assertEqual(r['risk_classification'], 'Severe')

    def test_above_normal(self):
        r = assess('female', 12, 12.5, 74.0)
        self.assertEqual(r['risk_classification'], 'Above Normal')

    def test_bad_input(self):
        with self.assertRaises(InputError): assess('male', 70, 10, 80)
        with self.assertRaises(InputError): assess('x', 10, 10, 80)

if __name__ == '__main__':
    unittest.main(verbosity=2)
