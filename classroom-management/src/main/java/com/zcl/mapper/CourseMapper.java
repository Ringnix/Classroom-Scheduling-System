package com.zcl.mapper;

import com.zcl.entity.Course;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;


@Mapper
public interface CourseMapper {
    List<Course> findAll();
    Course findById(@Param("id") String id);
    List<Course> findByTeacher(@Param("teacher") String teacher);
    int insert(Course course);
    int update(Course course);
    int delete(@Param("id") String id);
}