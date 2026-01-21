package com.zcl.controller;

import com.zcl.common.Result;
import com.zcl.dto.ScheduleDTO;
import com.zcl.entity.Schedule;
import com.zcl.service.ScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/schedule")
public class ScheduleController {

    @Autowired
    private ScheduleService scheduleService;

    @GetMapping("/list")
    public Result<List<ScheduleDTO>> listAll() {
        return Result.ok(scheduleService.listAll());
    }

    @GetMapping("/byClassroom/{classroomId}")
    public Result<List<ScheduleDTO>> listByClassroom(@PathVariable String classroomId) {
        return Result.ok(scheduleService.listByClassroom(classroomId));
    }

    @GetMapping("/byCourse/{courseId}")
    public Result<List<ScheduleDTO>> listByCourse(@PathVariable String courseId) {
        return Result.ok(scheduleService.listByCourse(courseId));
    }

    @GetMapping("/byTeacher")
    public Result<List<ScheduleDTO>> listByTeacher(@RequestParam String teacher) {
        return Result.ok(scheduleService.listByTeacher(teacher));
    }

    @PostMapping("/save")
    public Result<String> save(@RequestBody Schedule s) {
        return scheduleService.addSchedule(s);
    }

    @PutMapping("/update")
    public Result<String> update(@RequestBody Schedule s) {
        return scheduleService.updateSchedule(s);
    }

    @DeleteMapping("/delete/{id}")
    public Result<String> delete(@PathVariable String id) {
        return scheduleService.deleteSchedule(id);
    }

    @GetMapping("/byClassroomIdAndDate")
    public Result<List<ScheduleDTO>> listByClassroomIdAndDate(@RequestParam String classroomId, @RequestParam String date) {
        return Result.ok(scheduleService.listByClassroomIdAndDate(classroomId, date));
    }

    @GetMapping("/currentSchedules")
    public Result<List<ScheduleDTO>> listCurrentSchedules(@RequestParam String currentDate, @RequestParam String currentTime) {
        return Result.ok(scheduleService.listCurrentSchedules(currentDate, currentTime));
    }
    
    @PostMapping("/updateClassroomStatus")
    public Result<String> updateClassroomStatus() {
        scheduleService.updateClassroomStatus();
        return Result.ok("课室状态更新成功");
    }
}
