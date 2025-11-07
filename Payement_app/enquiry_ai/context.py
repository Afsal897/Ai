from log import logger
class ProjectContext:
    def __init__(self):
        self.last_project_id = None

    def update_project_id(self, project_id: int):
        self.last_project_id = project_id
        logger.info(f"📌 Updated project context to: {project_id}")