package com.zcl.mapper;

import com.zcl.entity.Classroom;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;


@Mapper
public interface ClassroomMapper {
    List<Classroom> findAll();
    Classroom findById(@Param("id") String id);
    int insert(Classroom classroom);
    int update(Classroom classroom);
    int delete(@Param("id") String id);
}