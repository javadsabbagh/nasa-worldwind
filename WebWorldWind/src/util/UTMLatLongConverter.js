define(['../geom/Location'], function(Location) {

    function UTMLatLongConverter() {


    }

    /*
     * This method converts degrees to radians
     * @param {degrees} : the value to be considered in degrees
     * @return : the radians equivalent to the degrees
     */
    UTMLatLongConverter.prototype.degreesToRadians = function(degrees) {
        var factor = Math.PI / 180;
        var ans = degrees * factor;
        return ans;
    };

    /*
     * This method takes the values of a UTM coordinate and converts it to a standard geographic
     * coodinate.
     * Adapted from python code at
     * http://stackoverflow.com/questions/343865/how-to-convert-from-utm-to-latlng-in-python-or-javascript
     * @param {easting} : the easting of the UTM coordinate
     * @param {northing} : the northing of the UTM coordinate
     * @param {zone} : the UTM zone of the location to be consisdered
     * @param {hemishpere} : the hemisphere that our location is located in, either 'N' or 'S'
     * @return : a WorldWind Location equivalent to the UTM coordinate supplied
     */

    UTMLatLongConverter.prototype.convertToLatLong = function(easting, northing , zone, hemisphere) {

        var modifiedNorthing, a, e, es1q, k0, arc, mu, ei, cb, cc, cd, n0,
            r0, fact1, a1, dd0, fact2, t0, Q0, fact3,
            fact4, lof1, lof2, lof3, a2, a3, latitude,
            longitude,ca, phi1;

        if (hemisphere === 'S') {
            modifiedNorthing = 10000000 - northing;
        } else {
            modifiedNorthing = northing;
        }

        // define constants here
        a = 6378137;
        e = 0.081819191;
        es1q = 0.006739497;
        k0 = 0.9996;

        arc = modifiedNorthing / k0;
        mu = arc / (a * (1 - Math.pow(e, 2) / 4.0 - 3 * Math.pow(e, 4)
            / 64.0 - 5 * Math.pow(e, 6) / 256.0));
        ei = (1 - Math.pow((1 - e * e), (1 / 2.0))) / (1 + Math.pow((1 - e * e), (1 / 2.0)));

        ca = 3 * ei / 2 - 27 * Math.pow(ei, 3) / 32.0;

        cb = 21 * Math.pow(ei, 2) / 16 - 55 * Math.pow(ei, 4) / 32;
        cc = 151 * Math.pow(ei, 3) / 96;
        cd = 1097 * Math.pow(ei, 4) / 512;
        phi1 = mu + ca * Math.sin(2 * mu) + cb * Math.sin(4 * mu) + cc * Math.sin(6 * mu) + cd * Math.sin(8 * mu);

        n0 = a / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (1 / 2.0));

        r0 = a * (1 - e * e) / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (3 / 2.0));
        fact1 = n0 * Math.tan(phi1) / r0;

        a1 = 500000 - easting;
        dd0 = a1 / (n0 * k0);
        fact2 = dd0 * dd0 / 2;

        t0 = Math.pow(Math.tan(phi1), 2);
        Q0 = es1q * Math.pow(Math.cos(phi1), 2);
        fact3 = (5 + 3 * t0 + 10 * Q0 - 4 * Q0 * Q0 - 9 * es1q) * Math.pow(dd0, 4) / 24;

        fact4 = (61 + 90 * t0 + 298 * Q0 + 45 * t0 * t0 - 252 * es1q - 3 * Q0 * Q0) * Math.pow(dd0, 6) / 720;

        lof1 = a1 / (n0 * k0);
        lof2 = (1 + 2 * t0 + Q0) * Math.pow(dd0, 3) / 6.0;
        lof3 = (5 - 2 * Q0 + 28 * t0 - 3 * Math.pow(Q0, 2) + 8 * es1q + 24 * Math.pow(t0, 2)) * Math.pow(dd0, 5) / 120;
        a2 = (lof1 - lof2 + lof3) / Math.cos(phi1);
        a3 = a2 * 180 / Math.PI;

        latitude = 180 * (phi1 - fact1 * (fact2 + fact3 + fact4)) / Math.PI;

        if (hemisphere === 'S') {
            latitude = -latitude;
        }


        if(zone > 0) {
            longitude = 6 * zone - 183.0 - a3;
        } else {
            longitude = 3.0 - a3;
        }

        return new WorldWind.Location(latitude, longitude);

    }


});