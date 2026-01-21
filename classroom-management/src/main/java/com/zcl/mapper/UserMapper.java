package com.zcl.mapper;

import com.zcl.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserMapper {
    User findByUsername(@Param("username") String username);
    int insert(User user);
    List<User> findAll();
    User findById(@Param("id") String id);
    int update(User user);
    int delete(@Param("id") String id);
}

