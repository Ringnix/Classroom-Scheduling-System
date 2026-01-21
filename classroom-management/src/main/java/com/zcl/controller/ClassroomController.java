package com.zcl.controller;

import com.zcl.common.Result;
import com.zcl.entity.Classroom;
import com.zcl.service.ClassroomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classroom")
public class ClassroomController {

    @Autowired
    private ClassroomService classroomService;

    @GetMapping("/all")
    public Result<List<Classroom>> all() {
        return Result.ok(classroomService.listAll());
    }

    @PostMapping("/save")
    public Result<String> save(@RequestBody Classroom c){
        return classroomService.saveClassroom(c);
    }

    @PutMapping("/update")
    public Result<String> update(@RequestBody Classroom c) {
        return classroomService.updateClassroom(c);
    }

    @DeleteMapping("/delete/{id}")
    public Result<String> delete(@PathVariable String id){
        return classroomService.deleteClassroom(id);
    }
}
