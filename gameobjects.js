
var Stage = function() {
    this.islands = [];
    this.portalEdges = [];
    this.startIsland = -1;
    this.goalDoor = null;
}


var portal_radius = 12;
var pickup_radius = 9;
var draw = function(camera) {
    return function(v){v.draw(camera)};
}

var Camera = function(stage) {
    this.x = 0;
    this.y = 0;

    // 0 = zoomed in, 1 = zoomed out.
    this.zoom = 0;
    this.computeBounds(stage);
}

Camera.prototype = {
    computeBounds: function(stage) {
        var pad = 50;
        var minX = stage.islands[0].x1;
        var maxX = stage.islands[0].x2;
        var minY = stage.islands[0].y1;
        var maxY = stage.islands[0].y2;

        stage.islands.forEach(function(isl) {
            if (isl.x1 < minX) minX = isl.x1;
            if (isl.x2 > maxX) maxX = isl.x2;
            if (isl.y1 < minY) minY = isl.y1;
            if (isl.y2 > maxY) maxY = isl.y2;
        });

        stage.portalEdges.forEach(function(portalEdge) {
            portalEdge.points.forEach(function(p) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            })
        });

        minX -= pad;
        maxX += pad;
        minY -= pad;
        maxY += pad;

        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
        this.mapCenterX = (minX+maxX)/2;
        this.mapCenterY = (minY+maxY)/2;
        
        this.zoomOutRatio = Math.max((maxX-minX)/RES_X, (maxY-minY)/RES_Y);
    },

    moveTowards: function(player) {
        this.x += 0.3 * (player.x - this.x);
        this.y += 0.3 * (player.y - this.y);
    },

    adjustZoom: function() {
        if (keyPressed[90]) {
            this.zoom += 0.1;
            if (this.zoom > 1) this.zoom = 1;
        }
        else {
            this.zoom -= 0.1;
            if (this.zoom < 0) this.zoom = 0;
        }

    },

    update: function(stage, player) {
        this.moveTowards(player);
        this.adjustZoom();

        var z = this.zoom;
        this.cx = this.x*(1-z) + this.mapCenterX*z;
        this.cy = this.y*(1-z) + this.mapCenterY*z;
        this.ratio = 1 / ((1-z) + this.zoomOutRatio*z);
    },

    absToRel: function(x, y) {
        return [(x - this.cx)*this.ratio + RES_X/2, (y - this.cy)*this.ratio + RES_Y/2];
    },

    absToRelX: function(x) {
        return (x - this.cx)*this.ratio + RES_X/2;
    },

    absToRelY: function(y) {
        return (y - this.cy)*this.ratio + RES_Y/2;
    },

    absToRelScale: function(s) {
        return s*this.ratio;
    },
}

var Player = function(stage) {
    this.v = stage.startIsland;
    var island = stage.islands[this.v];

    this.x = (island.x1+island.x2)/2;
    this.y = island.y2 - 5;
    this.radius = 10;
    this.speed = 7;
    this.energy = 0;
    this.coins = 0;
}

Player.prototype = {
    draw: function(camera) {
        var relX = camera.absToRelX(this.x);
        var relY = camera.absToRelY(this.y);

        drawCircle(relX, relY, camera.absToRelScale(this.radius+6), '#808080');
        drawCircle(relX, relY, camera.absToRelScale(this.radius+3), '#ffff00');
        drawCircle(relX, relY, camera.absToRelScale(this.radius), '#80ff00');
    },

    update: function(stage) {
        // Up: 38
        // Down: 40
        // Left: 37
        // Right: 39
        if (keyPressed[38]) this.y -= this.speed;
        if (keyPressed[40]) this.y += this.speed;
        if (keyPressed[37]) this.x -= this.speed;
        if (keyPressed[39]) this.x += this.speed;

        var island = stage.islands[this.v];
        if (this.x < island.x1) this.x = island.x1;
        if (this.x >= island.x2) this.x = island.x2;
        if (this.y < island.y1) this.y = island.y1;
        if (this.y >= island.y2) this.y = island.y2;
    },

}

var GoalDoor = function(x, y, v) {
    var width = 30;
    var height = 10;
    this.x1 = x - width/2;
    this.y1 = y - height/2;
    this.x2 = x + width/2;
    this.y2 = y + height/2;

    this.v = v;
}

GoalDoor.prototype = {
    draw: function(camera) {
        var relX1 = camera.absToRelX(this.x1);
        var relX2 = camera.absToRelX(this.x2);
        var relY1 = camera.absToRelY(this.y1);
        var relY2 = camera.absToRelY(this.y2);

        drawRect(relX1, relY1, relX2-relX1, relY2-relY1, '#80ff00');
    }
}


var Island = function(x1, y1, x2, y2, v) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.v = v;

    this.items = [];
    this.portals = [];
}

Island.prototype = {
    draw: function(camera) {
        var relX1 = camera.absToRelX(this.x1);
        var relX2 = camera.absToRelX(this.x2);
        var relY1 = camera.absToRelY(this.y1);
        var relY2 = camera.absToRelY(this.y2);

        drawRect(relX1, relY1, relX2-relX1, relY2-relY1, '#0000ff');
        this.portals.forEach(draw(camera));
        this.items.forEach(draw(camera));
    },
}

var Portal = function(x, y, v, vNext, edgeIndex) {
    this.type = 'portal';
    this.x = x;
    this.y = y;
    this.radius = portal_radius;
    this.v = v;
    this.vNext = vNext;
    this.edgeIndex = edgeIndex;
}

Portal.prototype = {
    draw: function(camera) {
        var relX = camera.absToRelX(this.x);
        var relY = camera.absToRelY(this.y);
        var relRad = camera.absToRelScale(this.radius);

        drawCircle(relX, relY, relRad, '#ff8000');
    },
}

var PickupEnergy = function(x, y, v) {
    this.type = 'energy';
    this.x = x;
    this.y = y;
    this.radius = pickup_radius;
    this.v = v;
    this.isActive = true;
}

PickupEnergy.prototype = {
    draw: function(camera) {
        var relX = camera.absToRelX(this.x);
        var relY = camera.absToRelY(this.y);
        var relRad = camera.absToRelScale(this.radius);

        drawCircle(relX, relY, relRad, '#00ffff');
    },
}

var PickupCoin = function(x, y, v) {
    this.type = 'coin';
    this.x = x;
    this.y = y;
    this.radius = pickup_radius;
    this.v = v;
    this.isActive = true;
}

PickupCoin.prototype = {
    draw: function(camera) {
        var relX = camera.absToRelX(this.x);
        var relY = camera.absToRelY(this.y);
        var relRad = camera.absToRelScale(this.radius);

        drawCircle(relX, relY, relRad, '#ffff00');
    },
}


var PortalEdge = function(v1, v2, edgeIndex, points) {
    this.v1 = v1;
    this.v2 = 2;
    this.edgeIndex = edgeIndex;
    this.points = points;
}

var convertPoint = function(camera) {
    return function(point) {
        return {
            x: camera.absToRelX(point.x),
            y: camera.absToRelY(point.y),
        };
    };
};

PortalEdge.prototype = {
    draw: function(camera) {
        var points = this.points.map(convertPoint(camera));
        var thickness = camera.absToRelScale(10);

        drawCurve(points, thickness, '#ff0000');
    },

}