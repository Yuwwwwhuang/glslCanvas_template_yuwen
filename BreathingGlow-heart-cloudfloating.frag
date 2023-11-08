// Author:Yu-Wen
// Title:BreathingGlow+noise

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float glow(float d, float str, float thickness){
    return thickness / pow(d, str);
}

vec2 hash2( vec2 x )            //亂數範圍 [-1,1]
{
    const vec2 k = vec2( 0.3183099, 0.3678794 );
    x = x*k + k.yx;
    return -1.0 + 2.0*fract( 16.0 * k*fract( x.x*x.y*(x.x+x.y)) );
}
float gnoise( in vec2 p )       //亂數範圍 [-1,1]
{
    vec2 i = floor( p );
    vec2 f = fract( p );
    
    vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( dot( hash2( i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ), 
                            dot( hash2( i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                         mix( dot( hash2( i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ), 
                            dot( hash2( i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
}
#define Use_Perlin
//#define Use_Value
float noise( in vec2 p )        //亂數範圍 [-1,1]
{
#ifdef Use_Perlin    
return gnoise(p);   //gradient noise
#elif defined Use_Value
return vnoise(p);       //value noise
#endif    
return 0.0;
}
float fbm(in vec2 uv)       //亂數範圍 [-1,1]
{
    float f;                                                //fbm - fractal noise (4 octaves)
    mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );
    f   = 0.5000*noise( uv ); uv = m*uv;          
    f += 0.2500*noise( uv ); uv = m*uv;
    f += 0.1250*noise( uv ); uv = m*uv;
    f += 0.0625*noise( uv ); uv = m*uv;
    return f;
}

//Star
float sdStar5(in vec2 p, in float r, in float rf)
{
    const vec2 k1 = vec2(0.809016994375, -0.587785252292);
    const vec2 k2 = vec2(-k1.x,k1.y);
    p.x = abs(p.x);
    p -= 2.0*max(dot(k1,p),0.0)*k1;
    p -= 2.0*max(dot(k2,p),0.0)*k2;
    p.x = abs(p.x);
    p.y -= r;
    vec2 ba = rf*vec2(-k1.y,k1.x) - vec2(0,1);
    float h = clamp( dot(p,ba)/dot(ba,ba), 0.0, r );
    return length(p-ba*h) * sign(p.y*ba.x-p.x*ba.y);
}

//heart
float M_SQRT_2 = 1.41;

float heart(vec2 P, float size)
{
float x = M_SQRT_2/2.0 * (P.x - P.y);
float y = M_SQRT_2/2.0 * (P.x + P.y);
float r1 = max(abs(x),abs(y))-size/3.5;
float r2 = length(P - M_SQRT_2/2.0*vec2(+1.0,-1.0)*size/3.5)
- size/3.5;
float r3 = length(P - M_SQRT_2/2.0*vec2(-1.0,-1.0)*size/3.5)
- size/3.5;
return min(min(r1,r2),r3);
}


void main() {
    vec2 uv = gl_FragCoord.xy/u_resolution.xy;
    uv.x *= u_resolution.x/u_resolution.y;
    uv= uv*2.0-1.0;
    
    //陰晴圓缺
    float pi=3.14159;
    float theta=2.0*pi*u_time/8.0;
    vec2 point=vec2(sin(theta), cos(theta));
    float dir= dot(point, (uv))+0.558;
    
    //亂數作用雲霧
    float fog= fbm(0.488*uv+vec2(-0.1*u_time, 0.052*u_time))*0.6+0.1; //vec2(-0.1*u_time, 0.052*u_time)漂動感

    //定義圓環
    float dist = length(uv);
    float circle_dist = abs(dist-0.512);                                //光環大小
    
    float result;
for (int index=0; index<9; ++index)    
{
    //model
    vec2 uv_flip = vec2(uv.x, -uv.y);
    //float weight = step(uv.y, 0.2); //大於0.5就是1，小於就是0
    float weight = smoothstep(0.100,-0.024,uv.y); //uv[-1,1]
    float freq = 9.0+float(index)*0.6;
    float noise = gnoise(uv_flip*freq+vec2(-0.1*u_time, 0.052*u_time))*0.172*weight;  //frenquency＆扭曲程度
    //float model_dist = abs(sdStar5(uv, 0.792, 0.304)); star
    float model_dist = abs(heart(uv_flip,0.756))+noise; //heart
    
    
    //動態呼吸
    float breathing=sin(2.0*u_time/6.0*pi)*0.5+0.4;                     //option1
    //float breathing=(exp(sin(u_time/2.0*pi)) - 0.36787944)*0.42545906412;         //option2 錯誤
     //float breathing=(exp(sin(u_time/2.0*pi)) - 0.36787944)*0.42545906412;                //option2 正確
    float strength =(0.1*breathing+0.180);          //[0.2~0.3]         //光暈強度加上動態時間營造呼吸感
    //float thickness=(0.1*breathing+0.084);     //[0.1~0.2]         //光環厚度 營造呼吸感
    float thickness= 0.1;
    float glow_model = glow(model_dist, strength, thickness);
    //float glow_circle = glow(circle_dist, strength, thickness);
    result += glow_model; //+everytime
}    
    gl_FragColor = vec4((result+fog*0.01*u_time)*vec3(1.000,0.325,0.611)*0.3,1.248); //*0.3降低整體亮度
    //gl_FragColor = vec4((vec3(glow_circle)+fog)*dir*vec3(1.0, 0.5, 0.25),1.0);
    
    
}