import { copy } from './common';
import constant from './constant';
import variable from './variable';

export const mods3600 = function(value) {
  return value - 1.296e6 * Math.floor(value / 1.296e6);
};

/* Reduce x modulo 2 pi */
export const modtp = function(x) {
  var y; // double

  y = Math.floor(x / constant.TPI);
  y = x - y * constant.TPI;
  while (y < 0.0) {
    y += constant.TPI;
  }
  while (y >= constant.TPI) {
    y -= constant.TPI;
  }
  return y;
};

/* Reduce x modulo 360 degrees */
export const mod360 = function(x) {
  var k; // int
  var y; // double

  k = Math.floor(x / 360.0);
  y = x - k * 360.0;
  while (y < 0.0) {
    y += 360.0;
  }
  while (y > 360.0) {
    y -= 360.0;
  }
  return y;
};

/* Reduce x modulo 30 degrees */
export const mod30 = function(x) {
  var k; // int
  var y; // double

  k = Math.floor(x / 30.0);
  y = x - k * 30.0;
  while (y < 0.0) {
    y += 30.0;
  }
  while (y > 30.0) {
    y -= 30.0;
  }
  return y;
};

export const zatan2 = function(x, y) {
  var z, w; // double
  var code; // short

  code = 0;

  if (x < 0.0) {
    code = 2;
  }
  if (y < 0.0) {
    code |= 1;
  }

  if (x == 0.0) {
    if (code & 1) {
      return 1.5 * Math.PI;
    }
    if (y == 0.0) {
      return 0.0;
    }
    return 0.5 * Math.PI;
  }

  if (y == 0.0) {
    if (code & 2) {
      return Math.PI;
    }
    return 0.0;
  }

  switch (code) {
    default:
    case 0:
      w = 0.0;
      break;
    case 1:
      w = 2.0 * Math.PI;
      break;
    case 2:
    case 3:
      w = Math.PI;
      break;
  }

  z = Math.atan(y / x);

  return w + z;
};

export const sinh = function(x) {
  return (Math.exp(x) - Math.exp(-x)) / 2;
};

export const cosh = function(x) {
  return (Math.exp(x) + Math.exp(-x)) / 2;
};

export const tanh = function(x) {
  return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x));
};

export const hms = function(x) {
  var h, m; // int
  var sint, sfrac; // long
  var s; // double
  var result = {};

  s = x * constant.RTOH;
  if (s < 0.0) {
    s += 24.0;
  }
  h = Math.floor(s);
  s -= h;
  s *= 60;
  m = Math.floor(s);
  s -= m;
  s *= 60;
  /* Handle shillings and pence roundoff. */
  sfrac = Math.floor(1000.0 * s + 0.5);
  if (sfrac >= 60000) {
    sfrac -= 60000;
    m += 1;
    if (m >= 60) {
      m -= 60;
      h += 1;
    }
  }
  sint = Math.floor(sfrac / 1000);
  sfrac -= Math.floor(sint * 1000);

  result.hours = h;
  result.minutes = m;
  result.seconds = sint;
  result.milliseconds = sfrac;

  return result;
};

export const dms = function(x) {
  var s; // double
  var d, m; // int
  var result = {};

  s = x * constant.RTD;
  if (s < 0.0) {
    s = -s;
  }
  d = Math.floor(s);
  s -= d;
  s *= 60;
  m = Math.floor(s);
  s -= m;
  s *= 60;

  result.degree = d;
  result.minutes = m;
  result.seconds = s;

  return result;
};

/* Display magnitude of correction vector in arc seconds */
export const showcor = function(p, dp, result) {
  var p1 = []; // dr, dd; // double
  var i; // int
  var d;

  for (i = 0; i < 3; i++) {
    p1[i] = p[i] + dp[i];
  }

  d = deltap(p, p1);

  result = result || {};
  result.dRA = (constant.RTS * d.dr) / 15.0;
  result.dDec = constant.RTS * d.dd;

  return result;
};

/* Display Right Ascension and Declination
 * from input equatorial rectangular unit vector.
 * Output vector pol[] contains R.A., Dec., and radius.
 */
export const showrd = function(p, pol, result) {
  var x, y, r; // double
  var i; // int

  r = 0.0;
  for (i = 0; i < 3; i++) {
    x = p[i];
    r += x * x;
  }
  r = Math.sqrt(r);

  x = zatan2(p[0], p[1]);
  pol[0] = x;

  y = Math.asin(p[2] / r);
  pol[1] = y;

  pol[2] = r;

  result = result || {};

  copy(result, {
    dRA: x,
    dDec: y,
    ra: hms(x),
    dec: dms(y)
  });

  return result;
};

/*
 * Convert change in rectangular coordinatates to change
 * in right ascension and declination.
 * For changes greater than about 0.1 degree, the
 * coordinates are converted directly to R.A. and Dec.
 * and the results subtracted.  For small changes,
 * the change is calculated to first order by differentiating
 *   tan(R.A.) = y/x
 * to obtain
 *    dR.A./cos**2(R.A.) = dy/x  -  y dx/x**2
 * where
 *    cos**2(R.A.)  =  1/(1 + (y/x)**2).
 *
 * The change in declination arcsin(z/R) is
 *   d asin(u) = du/sqrt(1-u**2)
 *   where u = z/R.
 *
 * p0 is the initial object - earth vector and
 * p1 is the vector after motion or aberration.
 *
 */
export const deltap = function(p0, p1, d) {
  var dp = [],
    A,
    B,
    P,
    Q,
    x,
    y,
    z; // double
  var i; // int

  d = d || {};

  P = 0.0;
  Q = 0.0;
  z = 0.0;
  for (i = 0; i < 3; i++) {
    x = p0[i];
    y = p1[i];
    P += x * x;
    Q += y * y;
    y = y - x;
    dp[i] = y;
    z += y * y;
  }

  A = Math.sqrt(P);
  B = Math.sqrt(Q);

  if (A < 1.0e-7 || B < 1.0e-7 || z / (P + Q) > 5.0e-7) {
    P = zatan2(p0[0], p0[1]);
    Q = zatan2(p1[0], p1[1]);
    Q = Q - P;
    while (Q < -Math.PI) {
      Q += 2.0 * Math.PI;
    }
    while (Q > Math.PI) {
      Q -= 2.0 * Math.PI;
    }
    d.dr = Q;
    P = Math.asin(p0[2] / A);
    Q = Math.asin(p1[2] / B);
    d.dd = Q - P;
    return d;
  }

  x = p0[0];
  y = p0[1];
  if (x == 0.0) {
    d.dr = 1.0e38;
  } else {
    Q = y / x;
    Q = (dp[1] - (dp[0] * y) / x) / (x * (1.0 + Q * Q));
    d.dr = Q;
  }

  x = p0[2] / A;
  P = Math.sqrt(1.0 - x * x);
  d.dd = (p1[2] / B - x) / P;

  return d;
};

/* Sun - object - earth angles and distances.
 * q (object), e (earth), and p (q minus e) are input vectors.
 * The answers are posted in the following global locations:
 */
export const angles = function(p, q, e) {
  var a, b, s; // double
  var i; // int

  variable.EO = 0.0;
  variable.SE = 0.0;
  variable.SO = 0.0;
  variable.pq = 0.0;
  variable.ep = 0.0;
  variable.qe = 0.0;
  for (i = 0; i < 3; i++) {
    a = e[i];
    b = q[i];
    s = p[i];
    variable.EO += s * s;
    variable.SE += a * a;
    variable.SO += b * b;
    variable.pq += s * b;
    variable.ep += a * s;
    variable.qe += b * a;
  }
  variable.EO = Math.sqrt(variable.EO); /* Distance between Earth and object */
  variable.SO = Math.sqrt(variable.SO); /* Sun - object */
  variable.SE = Math.sqrt(variable.SE); /* Sun - earth */
  /* Avoid fatality: if object equals sun, SO is zero.  */
  if (variable.SO > 1.0e-12) {
    variable.pq /= variable.EO * variable.SO; /* cosine of sun-object-earth */
    variable.qe /= variable.SO * variable.SE; /* cosine of earth-sun-object */
  }
  variable.ep /= variable.SE * variable.EO; /* -cosine of sun-earth-object */
};

/* Calculate angular separation between two objects
 * Src1, Src2 are body objects
 */
export const separation = function(Src1, Src2) {
  var ra1, ra2, dc1, dc2, t; // double

  ra1 = parseFloat(Src1.position.altaz.topocentric.ra);
  dc1 = parseFloat(Src1.position.altaz.topocentric.dec);
  ra2 = parseFloat(Src2.position.altaz.topocentric.ra);
  dc2 = parseFloat(Src2.position.altaz.topocentric.dec);
  t = Math.sin(dc1) * Math.sin(dc2) + Math.cos(dc1) * Math.cos(dc2) * Math.cos(ra1 - ra2);

  return constant.RTD * Math.acos(t);
};
