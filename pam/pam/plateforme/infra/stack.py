"""Pile CDK de PAM. Test et production sont deux piles distinctes.

Compte SISA 790561526299, région us-east-1.
Le seau acme-pam-balances est créé s'il n'existe pas : privé, AES256.
PAM ne reçoit que s3:GetObject sur pam/balances/per/* et sur la copie Vault.
"""

from __future__ import annotations

import aws_cdk as cdk
from aws_cdk import (
    Duration,
    RemovalPolicy,
    Stack,
    aws_apigateway as apigw,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_kms as kms,
    aws_lambda as lambda_,
    aws_s3 as s3,
    aws_wafv2 as waf,
)
from constructs import Construct

COMPTE = "790561526299"
REGION = "us-east-1"
SEAU_BALANCES = "acme-pam-balances"
SEAU_VAULT = "acme-prospection-data"
CLE_VAULT = "vault/vault-employee-list.csv"


class PamStack(Stack):
    def __init__(self, scope: Construct, identifiant: str, *, production: bool, **kwargs) -> None:
        super().__init__(scope, identifiant, **kwargs)
        cle = kms.Key(self, "ClePam", enable_key_rotation=True, removal_policy=RemovalPolicy.RETAIN)
        balances = s3.Bucket(
            self,
            "Balances",
            bucket_name=SEAU_BALANCES if production else f"{SEAU_BALANCES}-test",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            versioned=False,
            removal_policy=RemovalPolicy.RETAIN,
        )
        secret = cdk.aws_secretsmanager.Secret(self, "SecretOtp", encryption_key=cle)
        tables = {}
        for nom in ("defis", "quota", "verrous", "audit", "contacts", "sessions"):
            tables[nom] = dynamodb.Table(
                self,
                nom,
                table_name=f"pam-{nom}" if production else f"pam-test-{nom}",
                partition_key=dynamodb.Attribute(name="pk", type=dynamodb.AttributeType.STRING),
                billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
                encryption=dynamodb.TableEncryption.CUSTOMER_MANAGED,
                encryption_key=cle,
                time_to_live_attribute="expire" if nom != "audit" else None,
                removal_policy=RemovalPolicy.RETAIN if production else RemovalPolicy.DESTROY,
            )
        fonction = lambda_.Function(
            self,
            "Api",
            function_name="pam-api" if production else "pam-test-api",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="serveur.gestionnaire_lambda",
            code=lambda_.Code.from_asset(".."),
            timeout=Duration.seconds(10),
            environment={
                "PAM_S3_BUCKET": balances.bucket_name,
                "PAM_S3_PREFIX": "pam/balances",
                "PAM_VAULT_BUCKET": SEAU_VAULT,
                "PAM_VAULT_KEY": CLE_VAULT,
                "PAM_SECRET_ARN": secret.secret_arn,
                "PAM_WHATSAPP": "off",
            },
        )
        secret.grant_read(fonction)
        for table in tables.values():
            table.grant_read_write_data(fonction)
        balances.grant_read(fonction, "pam/balances/per/*")
        fonction.add_to_role_policy(
            iam.PolicyStatement(
                actions=["s3:GetObject"],
                resources=[f"arn:aws:s3:::{SEAU_VAULT}/{CLE_VAULT}"],
            )
        )
        fonction.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ses:SendEmail"],
                resources=["*"],
                conditions={"StringEquals": {"ses:FromAddress": "autorapport@acmehaiti.com"}},
            )
        )
        api = apigw.LambdaRestApi(
            self,
            "Passerelle",
            handler=fonction,
            proxy=True,
            deploy_options=apigw.StageOptions(throttling_rate_limit=5, throttling_burst_limit=10),
        )
        zone = waf.CfnWebACL(
            self,
            "Waf",
            default_action=waf.CfnWebACL.DefaultActionProperty(allow={}),
            scope="REGIONAL",
            visibility_config=waf.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name="pam",
                sampled_requests_enabled=True,
            ),
            rules=[
                waf.CfnWebACL.RuleProperty(
                    name="limite",
                    priority=1,
                    action=waf.CfnWebACL.RuleActionProperty(block={}),
                    statement=waf.CfnWebACL.StatementProperty(
                        rate_based_statement=waf.CfnWebACL.RateBasedStatementProperty(
                            limit=300,
                            aggregate_key_type="IP",
                        )
                    ),
                    visibility_config=waf.CfnWebACL.VisibilityConfigProperty(
                        cloud_watch_metrics_enabled=True,
                        metric_name="pam-limite",
                        sampled_requests_enabled=True,
                    ),
                )
            ],
        )
        waf.CfnWebACLAssociation(
            self,
            "WafApi",
            resource_arn=f"arn:aws:apigateway:{REGION}::/restapis/{api.rest_api_id}/stages/prod",
            web_acl_arn=zone.attr_arn,
        )


def main() -> None:
    application = cdk.App()
    commun = {"env": cdk.Environment(account=COMPTE, region=REGION)}
    PamStack(application, "pam-test", production=False, **commun)
    PamStack(application, "pam-prod", production=True, **commun)
    application.synth()


if __name__ == "__main__":
    main()
