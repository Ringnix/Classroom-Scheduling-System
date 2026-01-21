package com.zcl.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class User {
    private String id;       // UUID
    private String username;
    private String password;
    private String role;     // ADMIN or TEACHER
}
