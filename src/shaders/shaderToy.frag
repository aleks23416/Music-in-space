#define CELL_WIDTH 0.25
#define CELL_HEIGHT 0.25
#define S(a, b, c) smoothstep(a, b, c)

# define H_BARS 20.0
# define V_BARS 45.0
# define WIDTH (1.0/H_BARS)
# define HEIGHT (1.0/V_BARS)

float band(float a_min, float a_max, float b_min, float b_max, float x) {
    return smoothstep(a_min, a_max, x) * smoothstep(b_max, b_min, x);
}

// uv.x > 1.0 i uv.x < 0.0 al
// izvan [0, 1]^2 vrednost alfa kanala je 0
vec4 fn(vec2 uv) {
    #define BOTTOM_COLOR vec3(0.3, 0.5, 0.9)
    #define TOP_COLOR vec3(0.9, 0.1, 0.6)

    vec2 gUv = uv;
    uv.x = floor(uv.x * H_BARS) / H_BARS;
    uv.y = floor(uv.y * V_BARS) / V_BARS;
    

    // Time varying pixel color
    vec4 col = vec4(1.0);
    col.xy = uv;
    col.z = 0.0;
    
    float f = floor(uv.x*512.0);
    float amp = texelFetch(iChannel0, ivec2(f, 0.0), 0).x;
    float m = band(uv.x, uv.x+0.1*WIDTH, uv.x+0.9*WIDTH, uv.x+WIDTH, gUv.x);
    m *= band(uv.y, uv.y+0.01*HEIGHT, uv.y+0.99*HEIGHT, uv.y+HEIGHT, gUv.y);
    // m *= smoothstep(amp, amp*0.9, uv.y);
     m *= 1.0 - step(amp, uv.y);
    col.xyz = m*vec3(1.0, 0.8*smoothstep(amp, 0.0, uv.y), 0.1);
    col.xyz = mix(BOTTOM_COLOR, TOP_COLOR, uv.y)*m;
    col.a = m;
    

    // Output to screen
    return col;
}


float LineDist(vec3 a, vec3 b, vec3 p) {
        return length(cross(b-a, p-a))/length(p-a);
}

float df_line( in vec2 a, in vec2 b, in vec2 p)
{
    vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa,ba) / dot(ba,ba), 0., 1.);       
        return length(pa - ba * h);
}

/*
float line(vec2 a, vec2 b, vec2 uv) {
    float r1 = .005;
    float r2 = .001;

    float d = df_line(a, b, uv);
    float d2 = length(a-b);
    float fade = S(1.5, .5, d2);

    fade += S(.05, .02, abs(d2-.75));
    return S(r1, r2, d)*fade;
}
*/

float line(vec2 a, vec2 b, vec2 p) {
    // IMPLEMENTACIJA SA ZAOBLJENIM KRAJEVIMA
    const float width = 0.006;

    vec2 ab = b - a;
    vec2 ap = p - a;
    vec2 bp = p - b;

    float x = clamp(dot(ap, ab) / dot(ab, ab), 0., 1.);
    float mask = length(ap - x*ab);
    mask = smoothstep(width, 0.9*width, mask);
    float opacity = smoothstep(CELL_WIDTH*1.25, CELL_WIDTH*0.5, iConectivity*length(ab));

    return mask*opacity;
}


float N11(float x) {
    return fract(sin(234.*x +823.) * 1253.);
}

float N21(vec2 p) {
    p = fract(p*vec2(233.34, 851.73));
    p += dot(p, p+23.45);
    return fract(p.x*p.y+0.2);
}

vec2 N22(vec2 p) {
    float n = N21(p);
    return vec2(n, N21(p+n));
}

vec2 GetPoint(vec2 id, float t) {
    // Points in local cordinates
    // -(CELL_WIDTH/CELL_HEIGHT)/2 <= x <= (CELL_WIDTH/CELL_HEIGHT)/2
    // -0.5 <= y <= 0.5
    float aspect = CELL_WIDTH/CELL_HEIGHT;
    vec2 n = N22(id);
    float r = min(0.5, aspect / 2.0)-0.15;
    float local_x = sin(n.x*t + n.x) * r;
    float local_y = sin(n.y*t + n.y) * r;

    float ofsset_x = id.x * CELL_WIDTH;
    float ofsset_y = id.y * CELL_HEIGHT;

    float x = ofsset_x + (local_x + aspect/2.0)*CELL_WIDTH;
    float y = ofsset_y + (local_y + 0.5)*CELL_HEIGHT;

    return vec2(x, y);
}

vec4 starField(vec2 uv, float t) {
    t += 5.0;

    // Uv division in blocks
    vec2 id;
    vec2 gUv = uv;
    id.x = floor(uv.x / CELL_WIDTH);
    id.y = floor(uv.y / CELL_HEIGHT);
    uv.x = mod(uv.x, CELL_WIDTH)/CELL_WIDTH;
    uv.y = mod(uv.y, CELL_HEIGHT)/CELL_HEIGHT;
    uv -= 0.5;
    uv.x *= CELL_WIDTH/CELL_HEIGHT;


    // Output color buffer
    vec4 color = vec4(0.0);


    // Draw Points
    vec2 point = GetPoint(id, t);
    float r = 0.015;
    float d = length(gUv - point);
    //color = smoothstep(r, r*0.98, d) * vec3(1.0, 0.7, 0.4);


    // Draw Lines
    const vec3 line_color = vec3(0.2, 0.8, 0.3);
    float heiglight = 0.0;
    vec2 points[9];
    vec2 offsets[9];
    int i = 0;
    for (float x = -1.0; x <= 1.0; x++) {
        for (float y = -1.0; y <= 1.0; y++) {
            points[i++] = GetPoint(vec2(id.x + x, id.y + y), t);
        }
    }
    for (int i = 0; i < 9; i++) {
        vec2 a = points[4];
        vec2 b = points[i];
        float l = line(a, b, gUv);
        color = mix(color, vec4(line_color, l), l);
        heiglight += length(a-b);
    }
    color = mix(color, vec4(line_color, line(points[1], points[3],
gUv)), line(points[1], points[3], gUv));
    color = mix(color, vec4(line_color, line(points[1], points[5],
gUv)), line(points[1], points[5], gUv));
    color = mix(color, vec4(line_color, line(points[7], points[3],
gUv)), line(points[7], points[3], gUv));
    color = mix(color, vec4(line_color, line(points[7], points[5],
gUv)), line(points[7], points[5], gUv));

    // Light
    vec2 v = (gUv - points[4])*10.;
    for (int i = 0; i < 9; i++) {

    }
    float light = 0.1/(dot(v,v)+0.1);
    light *= sin(iTime*2. + 50.*points[4].x)*0.5 + 0.5;
    color = mix(color, vec4(line_color, light), light);

    return color;
}

float frequency(vec2 uv, float w, float h) {
    uv.x = mod(uv.x, w);
    uv.y = mod(uv.y, h);

    return 0.0;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{

    vec2 uv = fragCoord/iResolution.xy;
    float f = uv.x;
    uv -= 0.5;
    uv.x *= iResolution.x/iResolution.y;

    float gradient = min(0.0, uv.y+0.25);

    // ###########
    // Normalized pixel coordinates (from 0 to 1)
    #define AUDIO_HEIGHT 0.2
    vec2 wuv = fragCoord/iResolution.xy;
    wuv.y /= AUDIO_HEIGHT;
    wuv.x -= .5;
    wuv.x = abs(wuv.x);
    vec4 fc = fn(wuv);
    // ###########

    vec2 mouse = iMouse.xy / iResolution.xy;
    mouse -= 0.5;
    mouse.y *= -1.0;
    uv += mouse;

    float m;
    float t = iTime / 16.0;
    for (float delta = 0.0; delta < 12.0; delta += 12.0/4.0) {
        float s = sin(t/4.0+delta);
        float c = cos(t/4.0+delta);
        mat2 rot = mat2(c, s, -s, c);
        uv = rot*uv;

    // 0.01
        float t2 = (mod(iTime + delta , 12.0) / 12.0); // 0.0 -> 1.0
        float opacity = smoothstep(0.0, 0.18, t2);
        float z = mix(3.41, 0.007, t2);
        m += starField(uv*(z) + vec2(9.0*delta, 0.0), t).a * opacity;
        //m += starField(uv*(t2*2.6) + vec2(delta, 0.0), t).a * opacity;
    }

    //m += starField(uv*4.0, iTime).a;
    vec4 baseColor = sin(t*6.0*vec4(0.3451, 0.4568, 0.6573, 1.0))*0.4 + 0.6;
    baseColor.xyz = iColor;
    baseColor.a = 1.0;
    vec4 color = 2.0*m*baseColor;
    float fft = texelFetch(iChannel0, ivec2(fract(511.*f), 0.), 0).x*5.0;
    //float fft = texture(iChannel0, vec2(floor((f/4.0)/0.10)*0.10, 0.)).y*7.0; 
    color -= baseColor * gradient*fft;
    //color = vec4(vec3(f), 1.0);

    //m = line(vec2(-0.1, -0.1), vec2(+0.1, +0.1), uv);
    fragColor = color;
    //fragColor = mix(fragColor, fc, fc.a);
}

// https://youtu.be/KGJUl8Teipk?t=632
// Dodaj slojeve i rotiranje, i postepeno pojacavanje sloja