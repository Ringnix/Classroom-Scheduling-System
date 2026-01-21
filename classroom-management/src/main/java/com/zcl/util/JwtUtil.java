package com.zcl.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import java.util.Date;
import javax.crypto.SecretKey;

public class JwtUtil {
    private static final String SECRET = "ChangeThisSecretKeyForCourseTo32CharactersOrMore";
    private static final long EXPIRE_SECONDS = 86400L;

    public static String createToken(String username, String role){
        Date now = new Date();
        Date exp = new Date(now.getTime() + EXPIRE_SECONDS * 1000);
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes());
        return Jwts.builder()
                .setSubject(username)
                .claim("role", role)
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }
}
