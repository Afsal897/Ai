import uuid
from django.db import models
from pgvector.django import VectorField
from api.models import User



class Domain(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(unique=True)

    def __str__(self):
        return self.name
    class Meta:
        db_table = "domain"


class Client(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(unique=True)

    def __str__(self):
        return self.name
    class Meta:
        db_table = "client"


class Project(models.Model):
    id = models.AutoField(primary_key=True)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="projects", null=True)
    name = models.TextField(unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
    
    class Meta:
        db_table = "project"


class Technology(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(unique=True)

    def __str__(self):
        return self.name
    class Meta:
        db_table = "technology"


class ProjectTechnology(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="project_technologies")
    technology = models.ForeignKey(Technology, on_delete=models.CASCADE, related_name="project_technologies")

    class Meta:
        unique_together = ("project", "technology")
        db_table = "project_technology"



class ProjectDomain(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="project_domains")
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name="project_domains")

    class Meta:
        unique_together = ("project", "domain")
        db_table = "project_domain"


class Document(models.Model):
    DOCUMENT_TYPES = [
        ("RFP", "RFP"),
        ("Case Study", "Case Study")
    ]

    id = models.AutoField(primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="documents")
    content = models.CharField(max_length=8000, blank=True)
    name = models.TextField()
    type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)

    def __str__(self):
        return f"{self.document_name} ({self.document_type})"
    class Meta:
        db_table = "document"


class LangChainCollection(models.Model):
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, null=True)
    cmetadata = models.JSONField(blank=True, null=True)

    def __str__(self):
        return self.name or str(self.uuid)

    class Meta:
        db_table = "langchain_pg_collection"


class LangChainEmbedding(models.Model):
    id = models.CharField(primary_key=True, max_length=36,)
    collection = models.ForeignKey(
        LangChainCollection,
        on_delete=models.CASCADE,
        to_field="uuid",
        db_column="collection_id",
        related_name="embeddings"
    )
    embedding = VectorField(dimensions=3072)
    document = models.CharField(max_length=255, blank=True, null=True)
    cmetadata = models.JSONField(blank=True, null=True)

    def __str__(self):
        return f"Embedding {self.id} in Collection {self.collection_id}"

    class Meta:
        db_table = "langchain_pg_embedding"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name="profile")
    tone_score = models.JSONField()  # e.g., {"style": "formal"}
    verbosity_score = models.JSONField()  # e.g., {"summary": 0.7, "detailed": 0.3}
    technology_interest = models.JSONField()
    domain_interest = models.JSONField()  # e.g., [{"tag": "python", "score": 0.8}]
    recent_querie = models.JSONField()

    def __str__(self):
        return f"Profile of {self.user.id}"
    
    class Meta:
        db_table = "user_profile"