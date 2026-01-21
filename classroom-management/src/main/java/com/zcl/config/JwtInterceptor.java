package com.zcl.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class JwtInterceptor implements HandlerInterceptor {

    private static final String SECRET = "ChangeThisSecretKeyForCourseTo32CharactersOrMore";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String path = request.getRequestURI();
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        // 放行登录/注册接口
        if (path.startsWith("/api/auth/")) return true;

        // 获取 token
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth == null || !auth.startsWith("Bearer ")) {
            response.setStatus(401);
            return false;
        }

        try {
            String token = auth.substring(7);
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(SECRET.getBytes())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            request.setAttribute("username", claims.getSubject());
            request.setAttribute("role", claims.get("role"));
        } catch (Exception e) {
            response.setStatus(401);
            return false;
        }

        // 管理员权限校验：delete 接口需要 ADMIN
        if (path.contains("/delete") && !"ADMIN".equals(request.getAttribute("role"))) {
            response.setStatus(403);
            return false;
        }

        return true;
    }
}
